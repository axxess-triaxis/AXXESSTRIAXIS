import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { auditLogsRepository, organizationsRepository, tenantScopeFromUser } from "../../../../repositories/supabaseEnterpriseRepositories";
import { canManageOrganization } from "../../../../security/rbac";
import { PROFILE_MEDIA_BUCKET, buildLogoStoragePath, validateAvatarUpload } from "../../../../services/storage/profileMediaStorage";
import { getSupabaseConfig, putStorageObject } from "../../../../services/storage/chunkedUploadStorage";

// MN-8 (2026-08-24): item 13 -- organization logo upload, gated to Super Admin/Organization Admin
// via canManageOrganization (the same already-hardened, same-tenant-only check desktop/mobile
// Settings use). No :id in the URL -- this route only ever acts on the caller's own organization,
// so there is no id to spoof in the first place. Unlike the avatar route, this also persists
// logoPath in the same request (there is no pre-existing "update organization" UI flow the way
// updateProfile already exists for users) via organizationsRepository.update -- see
// updateOrganization/organizationUpdateMutation in supabaseEnterpriseRepositories.ts for why that
// call bypasses the generic MutableTenantRepository pattern (Organization has no organizationId
// field of its own).
export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageOrganization(session.user, session.user.organizationId)) {
    return NextResponse.json({ error: "Only Super Admin and Organization Admin can update the organization logo." }, { status: 403 });
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

  const path = buildLogoStoragePath(session.user.organizationId, fileName || "logo");

  try {
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength !== sizeBytes) {
      return NextResponse.json({ error: "Uploaded image size did not match the expected size." }, { status: 400 });
    }

    await putStorageObject(config, path, bytes, session.accessToken, mimeType, PROFILE_MEDIA_BUCKET);

    const scope = tenantScopeFromUser(session.user, session.accessToken);
    const organization = await organizationsRepository.update(scope, session.user.organizationId, { logoPath: path });

    await auditLogsRepository.record(scope, {
      action: "organization.logo_updated",
      resourceType: "organization",
      resourceId: session.user.organizationId,
      category: "organization-management",
      metadata: { bucket: PROFILE_MEDIA_BUCKET, path, sizeBytes: bytes.byteLength },
    }).catch(() => undefined);

    return NextResponse.json({ path, organization });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to upload organization logo.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
