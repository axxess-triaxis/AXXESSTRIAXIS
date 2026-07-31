import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { documentPathBelongsToOrganization, validateDocumentUpload } from "../../../../services/storage/documentStorage";
import { getSupabaseConfig, putStorageObject, tempChunkPath } from "../../../../services/storage/chunkedUploadStorage";

// Accepts ONE CHUNK of a document upload (not the whole file). The browser only ever talks to
// this same-origin route -- never directly to Supabase's domain -- per the 2026-07-26 incident
// that a direct browser-to-Supabase-Storage signed-URL PUT caused (CORS/404 preflight failure,
// masked behind a fake success toast; see
// docs/readiness/KNOWLEDGE_HUB_UPLOAD_PERSISTENCE_INCIDENT_CLOSEOUT_2026_07_26.md). Chunking
// exists because Vercel serverless functions cap an INCOMING request body at ~4.5MB; splitting the
// upload into chunks keeps every browser->our-server request under that ceiling while server-to-
// server calls (this route -> Supabase Storage) have no such limit. See
// POST /api/documents/upload/complete for the assembly step.
export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const path = url.searchParams.get("path")?.trim() ?? "";
  const uploadId = url.searchParams.get("uploadId")?.trim() ?? "";
  const chunkIndex = Number(url.searchParams.get("chunkIndex"));
  const totalChunks = Number(url.searchParams.get("totalChunks"));
  const mimeType = url.searchParams.get("mimeType") ?? "application/octet-stream";
  const sizeBytes = Number(url.searchParams.get("sizeBytes") ?? 0);
  const fileName = url.searchParams.get("fileName") ?? "";

  if (!path || !documentPathBelongsToOrganization(path, session.user.organizationId)) {
    return NextResponse.json({ error: "Document path is outside the active organization." }, { status: 403 });
  }
  if (!uploadId || !/^[0-9a-f-]{36}$/i.test(uploadId)) {
    return NextResponse.json({ error: "A valid uploadId is required." }, { status: 400 });
  }
  if (!Number.isInteger(chunkIndex) || chunkIndex < 0 || !Number.isInteger(totalChunks) || totalChunks < 1 || chunkIndex >= totalChunks) {
    return NextResponse.json({ error: "chunkIndex/totalChunks are invalid." }, { status: 400 });
  }

  const validationError = validateDocumentUpload({ fileName, mimeType, sizeBytes });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const config = getSupabaseConfig();
  if (!config) {
    return NextResponse.json({ error: "Supabase Storage is not configured." }, { status: 503 });
  }

  try {
    const chunkBytes = await request.arrayBuffer();
    // The bucket's allowed_mime_types allowlist (202607040001_sprint9_knowledge_hub.sql) does not
    // include "application/octet-stream" -- writing a temp chunk with that generic content-type
    // gets rejected by Supabase Storage's own bucket policy. Use the real file's mimeType (already
    // validated above) for the chunk write too, not just the final assembled object.
    await putStorageObject(config, tempChunkPath(session.user.organizationId, uploadId, chunkIndex), chunkBytes, session.accessToken, mimeType);
    return NextResponse.json({ ok: true, chunkIndex });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload document chunk.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
