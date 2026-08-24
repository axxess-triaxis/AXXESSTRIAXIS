// MN-8 (2026-08-24): user avatar + organization logo upload, docs/readiness/
// ANDROID_BETA_0_9_V3_WALKTHROUGH_TRIAGE_2026_08_24.md items 13-14. A dedicated bucket
// (axxess-avatars), not a path prefix inside axxess-documents -- that bucket's own write RLS
// excludes Consultant/Guest, but avatar upload needs every role; a dedicated bucket also enforces
// a much smaller size cap and an image-only mime allowlist at the Supabase config level.
// Single-shot upload, not chunked like documentStorage.ts -- the 4MB bucket cap here stays safely
// under Vercel's ~4.5MB serverless body limit, so the multi-request chunking machinery documents
// need (for files that can exceed that cap) is unnecessary complexity at this size.
import { sanitizeStorageFileName } from "./documentStorage";

export const PROFILE_MEDIA_BUCKET = "axxess-avatars";
export const MAX_AVATAR_UPLOAD_BYTES = 4 * 1024 * 1024;

export const allowedAvatarMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
const allowedAvatarMimeTypeSet = new Set<string>(allowedAvatarMimeTypes);

// Path: organizations/{orgId}/users/{userId}/avatar/{filename} -- matches the storage RLS policy
// in 20260824120000_profile_media_avatar_logo.sql, which checks foldername segments 1-5 exactly.
export function buildAvatarStoragePath(organizationId: string, userId: string, fileName: string) {
  return ["organizations", organizationId, "users", userId, "avatar", sanitizeStorageFileName(fileName)].join("/");
}

// Path: organizations/{orgId}/logo/{filename} -- matches the same migration's logo RLS policy.
export function buildLogoStoragePath(organizationId: string, fileName: string) {
  return ["organizations", organizationId, "logo", sanitizeStorageFileName(fileName)].join("/");
}

export function validateAvatarUpload(input: { mimeType?: string; sizeBytes?: number }) {
  const mimeType = input.mimeType?.trim() || "";
  if (!allowedAvatarMimeTypeSet.has(mimeType)) {
    return "Image must be JPEG, PNG, WEBP, or GIF.";
  }
  if ((input.sizeBytes ?? 0) > MAX_AVATAR_UPLOAD_BYTES) {
    return `Image must be ${Math.floor(MAX_AVATAR_UPLOAD_BYTES / 1024 / 1024)}MB or smaller.`;
  }
  return undefined;
}

// Resolved client-side to a public URL -- the axxess-avatars bucket is public=true (see the
// migration's own comment on why), so this is a safe GET-only computation, not a signed request.
export function buildPublicAvatarUrl(avatarPath?: string): string | undefined {
  if (!avatarPath) return undefined;
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!baseUrl) return undefined;
  const encodedPath = avatarPath.split("/").map((part) => encodeURIComponent(part)).join("/");
  return `${baseUrl}/storage/v1/object/public/${PROFILE_MEDIA_BUCKET}/${encodedPath}`;
}
