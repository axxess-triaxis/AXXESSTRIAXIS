import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../../auth/serverSession";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../../repositories/supabaseEnterpriseRepositories";
import { DOCUMENT_STORAGE_BUCKET, documentPathBelongsToOrganization, validateDocumentUpload } from "../../../../../services/storage/documentStorage";
import { deleteStorageObject, getStorageObject, getSupabaseConfig, putStorageObject, tempChunkPath } from "../../../../../services/storage/chunkedUploadStorage";

// Assembly step for the chunked upload flow: downloads every chunk this uploadId staged (server to
// server -- no ~4.5MB request-body ceiling applies to that direction), concatenates them, writes
// the final object at the real target path, then best-effort cleans up the temp chunks. Real work,
// so it needs headroom beyond the default route duration.
// NOTE: this requires the Vercel plan tier to support 60s function duration (Hobby defaults to
// 10s) -- flagged, not assumed; confirm the plan tier before relying on this in production.
export const maxDuration = 60;

type CompleteRequest = {
  path?: string;
  uploadId?: string;
  totalChunks?: number;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
};

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as CompleteRequest;
  const path = body.path?.trim() ?? "";
  const uploadId = body.uploadId?.trim() ?? "";
  const totalChunks = Number(body.totalChunks);
  const fileName = body.fileName ?? "";
  const mimeType = body.mimeType ?? "application/octet-stream";
  const sizeBytes = Number(body.sizeBytes ?? 0);

  if (!path || !documentPathBelongsToOrganization(path, session.user.organizationId)) {
    return NextResponse.json({ error: "Document path is outside the active organization." }, { status: 403 });
  }
  if (!uploadId || !/^[0-9a-f-]{36}$/i.test(uploadId)) {
    return NextResponse.json({ error: "A valid uploadId is required." }, { status: 400 });
  }
  if (!Number.isInteger(totalChunks) || totalChunks < 1) {
    return NextResponse.json({ error: "totalChunks is invalid." }, { status: 400 });
  }

  const validationError = validateDocumentUpload({ fileName, mimeType, sizeBytes });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const config = getSupabaseConfig();
  if (!config) return NextResponse.json({ error: "Supabase Storage is not configured." }, { status: 503 });

  const chunkPaths = Array.from({ length: totalChunks }, (_, index) => tempChunkPath(session.user.organizationId, uploadId, index));

  try {
    const chunkBuffers: ArrayBuffer[] = [];
    for (const chunkPath of chunkPaths) {
      chunkBuffers.push(await getStorageObject(config, chunkPath, session.accessToken));
    }

    const assembled = Buffer.concat(chunkBuffers.map((buffer) => Buffer.from(buffer)));
    if (sizeBytes > 0 && assembled.length !== sizeBytes) {
      throw new Error(`Assembled upload size (${assembled.length} bytes) did not match the expected size (${sizeBytes} bytes) -- refusing to write a corrupted file.`);
    }

    await putStorageObject(config, path, assembled, session.accessToken, mimeType);

    const scope = tenantScopeFromUser(session.user, session.accessToken);
    await auditLogsRepository.record(scope, {
      action: "document.uploaded",
      resourceType: "document_storage",
      category: "knowledge-hub",
      metadata: { bucket: DOCUMENT_STORAGE_BUCKET, path, fileName, sizeBytes: assembled.length, chunks: totalChunks },
    }).catch(() => undefined);

    // Best-effort: cleanup can legitimately fail for a non-admin uploader (delete requires
    // Super Admin/Organization Admin per the bucket's RLS policy) -- the real upload already
    // succeeded above, so a leftover temp chunk is a minor storage-hygiene issue, not a user-facing
    // failure.
    await Promise.all(chunkPaths.map((chunkPath) => deleteStorageObject(config, chunkPath, session.accessToken).catch(() => undefined)));

    return NextResponse.json({ path });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to finalize document upload.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
