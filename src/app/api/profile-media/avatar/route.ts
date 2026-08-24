import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { auditLogsRepository, tenantScopeFromUser } from "../../../../repositories/supabaseEnterpriseRepositories";
import { PROFILE_MEDIA_BUCKET, buildAvatarStoragePath, validateAvatarUpload } from "../../../../services/storage/profileMediaStorage";
import { getSupabaseConfig, putStorageObject } from "../../../../services/storage/chunkedUploadStorage";

// MN-8 (2026-08-24): item 14 -- avatar upload, every authenticated role, no RBAC gate beyond a
// real session. Single-shot (not chunked, see profileMediaStorage.ts) -- the whole file always
// fits in one request under the 4MB bucket cap. Path is always computed server-side from the
// caller's own session (never client-supplied), closing the class of cross-user path-spoofing bug
// this codebase's RBAC comments repeatedly warn about elsewhere.
export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const fileName = url.searchParams.get("fileName") ?? "";
  const mimeType = url.searchParams.get("mimeType") ?? "application/octet-stream";
  const sizeBytes = Number(url.searchParams.get("sizeBytes") ?? 0);

  const validationError = validateAvatarUpload({ mimeType, sizeBytes });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const config = getSupabaseConfig();
  if (!config) {
    return NextResponse.json({ error: "Supabase Storage is not configured." }, { status: 503 });
  }

  const path = buildAvatarStoragePath(session.user.organizationId, session.user.id, fileName || "avatar");

  try {
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength !== sizeBytes) {
      return NextResponse.json({ error: "Uploaded image size did not match the expected size." }, { status: 400 });
    }

    await putStorageObject(config, path, bytes, session.accessToken, mimeType, PROFILE_MEDIA_BUCKET);

    const scope = tenantScopeFromUser(session.user, session.accessToken);
    await auditLogsRepository.record(scope, {
      action: "profile.avatar_uploaded",
      resourceType: "user",
      resourceId: session.user.id,
      category: "user-management",
      metadata: { bucket: PROFILE_MEDIA_BUCKET, path, sizeBytes: bytes.byteLength },
    }).catch(() => undefined);

    return NextResponse.json({ path });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload avatar.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
