import type { RoleName } from "../domain";
import { isRoleName, mockCurrentUserContext, type UserContext } from "../security/rbac";

type SupabaseAuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

export type SupabaseUserRow = {
  id: string;
  organization_id: string;
  email: string;
  display_name: string;
  avatar_initials: string;
  role: string;
};

function readMetadataString(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : undefined;
}

export function normalizeRole(value: string | undefined): RoleName {
  return value && isRoleName(value) ? value : "Employee";
}

export function userContextFromSupabaseRow(row: SupabaseUserRow): UserContext {
  return {
    id: row.id,
    organizationId: row.organization_id,
    role: normalizeRole(row.role),
    email: row.email,
    displayName: row.display_name,
    avatarInitials: row.avatar_initials,
  };
}

export function userContextFromAuthUser(authUser: SupabaseAuthUser): UserContext {
  const metadata = authUser.app_metadata ?? authUser.user_metadata;
  const email = authUser.email ?? readMetadataString(metadata, "email") ?? "";
  const displayName = readMetadataString(metadata, "display_name") ?? readMetadataString(metadata, "name") ?? email.split("@")[0] ?? "AXXESS User";
  const generatedInitials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "AU";

  return {
    id: authUser.id,
    organizationId: readMetadataString(metadata, "organization_id") ?? mockCurrentUserContext.organizationId,
    role: normalizeRole(readMetadataString(metadata, "role")),
    email,
    displayName,
    avatarInitials: readMetadataString(metadata, "avatar_initials") ?? generatedInitials,
  };
}
