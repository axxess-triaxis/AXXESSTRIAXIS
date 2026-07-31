import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { documentPathBelongsToOrganization } from "../../../../services/storage/documentStorage";
import { getStorageObject, getSupabaseConfig } from "../../../../services/storage/chunkedUploadStorage";
import { extractDocumentText } from "../../../../services/rag/ingestion/documentTextExtraction";

// Runs real text extraction against a document already sitting in Supabase Storage. Split out from
// the upload path itself (previously ran inline during the upload relay) so uploading and
// extracting are independent steps -- extraction now downloads the already-uploaded object
// server-to-server, which has no ~4.5MB request-body ceiling the way an inbound browser upload
// does. OCR can be slow, so this needs headroom beyond the default route duration.
// NOTE: this requires the Vercel plan tier to support 60s function duration (Hobby defaults to
// 10s) -- flagged, not assumed; confirm the plan tier before relying on this in production.
export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { path?: string; mimeType?: string };
  const path = body.path?.trim() ?? "";
  const mimeType = body.mimeType ?? "application/octet-stream";

  if (!path || !documentPathBelongsToOrganization(path, session.user.organizationId)) {
    return NextResponse.json({ error: "Document path is outside the active organization." }, { status: 403 });
  }

  const config = getSupabaseConfig();
  if (!config) return NextResponse.json({ error: "Supabase Storage is not configured." }, { status: 503 });

  try {
    const fileBytes = await getStorageObject(config, path, session.accessToken);
    const extraction = await extractDocumentText(Buffer.from(fileBytes), mimeType).catch((error) => ({
      supported: false as const,
      text: "",
      truncated: false,
      reason: error instanceof Error ? error.message : "Text extraction failed.",
    }));
    return NextResponse.json({ extraction });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to read the uploaded document for extraction.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
