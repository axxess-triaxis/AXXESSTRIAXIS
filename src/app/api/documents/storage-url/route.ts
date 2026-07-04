import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../repositories/supabaseEnterpriseRepositories";
import {
  DOCUMENT_STORAGE_BUCKET,
  documentPathBelongsToOrganization,
  validateDocumentUpload,
} from "../../../../services/storage/documentStorage";

type StorageUrlRequest = {
  action?: "upload" | "download";
  path?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  expiresIn?: number;
};

type SupabaseSignedUrlResponse = {
  signedURL?: string;
  signedUrl?: string;
  url?: string;
  token?: string;
};

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return undefined;
  return { url, anonKey };
}

function encodeStoragePath(path: string) {
  return path.split("/").map((part) => encodeURIComponent(part)).join("/");
}

function absoluteSignedUrl(supabaseUrl: string, signedUrl: string) {
  if (/^https?:\/\//.test(signedUrl)) return signedUrl;
  return `${supabaseUrl}${signedUrl.startsWith("/") ? "" : "/"}${signedUrl}`;
}

async function createSupabaseStorageIntent(
  action: "upload" | "download",
  path: string,
  expiresIn: number,
  accessToken: string,
) {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase Storage is not configured.");

  const endpoint = action === "upload"
    ? `object/upload/sign/${DOCUMENT_STORAGE_BUCKET}/${encodeStoragePath(path)}`
    : `object/sign/${DOCUMENT_STORAGE_BUCKET}/${encodeStoragePath(path)}`;

  const response = await fetch(`${config.url}/storage/v1/${endpoint}`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(action === "upload" ? { upsert: false } : { expiresIn }),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Supabase Storage signed URL request failed: ${response.status} ${message}`);
  }

  const payload = await response.json() as SupabaseSignedUrlResponse;
  const signedUrl = payload.signedUrl ?? payload.signedURL ?? payload.url;
  if (!signedUrl) throw new Error("Supabase Storage did not return a signed URL.");

  return {
    bucket: DOCUMENT_STORAGE_BUCKET,
    path,
    signedUrl: absoluteSignedUrl(config.url, signedUrl),
    token: payload.token,
    expiresIn,
  };
}

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as StorageUrlRequest;
  const action = body.action;
  const path = typeof body.path === "string" ? body.path.trim() : "";
  const expiresIn = Math.min(Math.max(Number(body.expiresIn ?? 600), 60), 60 * 60);

  if (action !== "upload" && action !== "download") {
    return NextResponse.json({ error: "Storage action must be upload or download." }, { status: 400 });
  }

  if (!path || !documentPathBelongsToOrganization(path, session.user.organizationId)) {
    return NextResponse.json({ error: "Document path is outside the active organization." }, { status: 403 });
  }

  if (action === "upload" && body.fileName) {
    const validationError = validateDocumentUpload({
      fileName: body.fileName,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
    });
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const scope = tenantScopeFromUser(session.user, session.accessToken);
    const intent = await createSupabaseStorageIntent(action, path, expiresIn, session.accessToken);

    await auditLogsRepository.record(scope, {
      action: action === "upload" ? "document.signed_upload_url_created" : "document.signed_download_url_created",
      resourceType: "document_storage",
      category: "knowledge-hub",
      metadata: {
        bucket: DOCUMENT_STORAGE_BUCKET,
        path,
        expiresIn,
      },
    }).catch(() => undefined);

    return NextResponse.json(intent);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create a signed storage URL.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
