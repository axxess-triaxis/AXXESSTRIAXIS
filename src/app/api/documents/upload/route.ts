import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../repositories/supabaseEnterpriseRepositories";
import {
  DOCUMENT_STORAGE_BUCKET,
  documentPathBelongsToOrganization,
  validateDocumentUpload,
} from "../../../../services/storage/documentStorage";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return undefined;
  return { url, anonKey };
}

function encodeStoragePath(path: string) {
  return path.split("/").map((part) => encodeURIComponent(part)).join("/");
}

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => undefined);
  const path = formData?.get("path");
  const file = formData?.get("file");

  if (typeof path !== "string" || !path.trim()) {
    return NextResponse.json({ error: "Document path is required." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Document file is required." }, { status: 400 });
  }

  if (!documentPathBelongsToOrganization(path, session.user.organizationId)) {
    return NextResponse.json({ error: "Document path is outside the active organization." }, { status: 403 });
  }

  const validationError = validateDocumentUpload({
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const config = getSupabaseConfig();
  if (!config) {
    return NextResponse.json({ error: "Supabase Storage is not configured." }, { status: 503 });
  }

  try {
    const uploadResponse = await fetch(
      `${config.url}/storage/v1/object/${DOCUMENT_STORAGE_BUCKET}/${encodeStoragePath(path)}`,
      {
        method: "POST",
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": file.type || "application/octet-stream",
        },
        body: await file.arrayBuffer(),
        cache: "no-store",
      },
    );

    if (!uploadResponse.ok) {
      const message = await uploadResponse.text().catch(() => "");
      throw new Error(`Supabase Storage upload failed: ${uploadResponse.status} ${message}`);
    }

    const scope = tenantScopeFromUser(session.user, session.accessToken);
    await auditLogsRepository.record(scope, {
      action: "document.uploaded",
      resourceType: "document_storage",
      category: "knowledge-hub",
      metadata: {
        bucket: DOCUMENT_STORAGE_BUCKET,
        path,
        fileName: file.name,
        sizeBytes: file.size,
      },
    }).catch(() => undefined);

    return NextResponse.json({ path });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload document.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
