import type { RoleName } from "../domain";
import { isRoleName, type UserContext } from "../security/rbac";

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
  department_name?: string | null;
  title?: string | null;
  timezone?: string | null;
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
    department: row.department_name ?? undefined,
    title: row.title ?? undefined,
    timezone: row.timezone ?? undefined,
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

  const organizationId = readMetadataString(metadata, "organization_id");

  return {
    id: authUser.id,
    // Never fall back to a demo/mock placeholder here -- this is a real, Supabase-authenticated
    // user, and this function is only reached when no public.users row exists yet (see
    // resolveUser() in serverSession.ts), meaning organization provisioning genuinely has not
    // happened. A placeholder like "org_clean_tenant" is not a valid uuid and would make every
    // subsequent live repository query fail with a Postgres 22P02 error instead of routing the
    // user to onboarding, where they belong.
    organizationId: organizationId ?? "",
    needsOnboarding: !organizationId,
    role: normalizeRole(readMetadataString(metadata, "role")),
    email,
    displayName,
    avatarInitials: readMetadataString(metadata, "avatar_initials") ?? generatedInitials,
  };
}
