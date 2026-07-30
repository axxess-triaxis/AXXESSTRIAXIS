import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../repositories/supabaseEnterpriseRepositories";
import {
  DOCUMENT_STORAGE_BUCKET,
  documentPathBelongsToOrganization,
  validateDocumentUpload,
} from "../../../../services/storage/documentStorage";
import { extractDocumentText } from "../../../../services/rag/ingestion/documentTextExtraction";

// OCR fallback (PDF page rendering + Tesseract recognition) needs meaningfully more time than a
// plain upload. Default Next.js route duration is too short for that path.
// NOTE: this requires the Vercel plan tier to support 60s function duration (Hobby defaults to
// 10s) -- flagged, not assumed; confirm the plan tier before relying on this in production.
export const maxDuration = 60;

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
    const fileBytes = await file.arrayBuffer();

    const uploadResponse = await fetch(
      `${config.url}/storage/v1/object/${DOCUMENT_STORAGE_BUCKET}/${encodeStoragePath(path)}`,
      {
        method: "POST",
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": file.type || "application/octet-stream",
        },
        body: fileBytes,
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

    const extraction = await extractDocumentText(Buffer.from(fileBytes), file.type || "application/octet-stream")
      .catch((error) => ({
        supported: false as const,
        text: "",
        truncated: false,
        reason: error instanceof Error ? error.message : "Text extraction failed.",
      }));

    return NextResponse.json({ path, extraction });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload document.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
