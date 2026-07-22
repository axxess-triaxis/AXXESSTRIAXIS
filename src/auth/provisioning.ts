import type { Organization, RoleName } from "../domain";
import type { UserContext } from "../security/rbac";
import { isRoleName } from "../security/rbac";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../repositories/supabaseAdmin";

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  sector: Organization["sector"];
  created_at: string;
  updated_at: string;
};

type RoleRow = {
  id: string;
};

type DepartmentRow = {
  id: string;
};

type WorkspaceRow = {
  id: string;
};

export type TenantProvisioningInput = {
  organizationName: string;
  sector?: string;
  role?: string;
  departmentName?: string;
  workspaceName?: string;
  acceptedNotices?: string[];
};

export type ProfileInput = {
  displayName?: string;
  email?: string;
  avatarInitials?: string;
  department?: string;
  title?: string;
  timezone?: string;
};

const sectorMap: Record<string, Organization["sector"]> = {
  Government: "government",
  Healthcare: "healthcare",
  "NGO / non-profit": "ngo",
  MSME: "enterprise",
  Startup: "enterprise",
  Enterprise: "enterprise",
  "Consulting / advisory": "consulting",
};

export function slugFromOrganizationName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 54) || "axxess-organization";
}

export function initialsForName(nameOrEmail: string) {
  const source = nameOrEmail.includes("@") ? nameOrEmail.split("@")[0] : nameOrEmail;
  return source
    .split(/[\s._-]+/)
    .map((part) => part[0])
    .join("")
    .replace(/[^a-z]/gi, "")
    .slice(0, 3)
    .toUpperCase() || "AU";
}

export function normalizeOnboardingSector(value?: string): Organization["sector"] {
  return value && sectorMap[value] ? sectorMap[value] : "other";
}

export function normalizeOnboardingRole(value?: string): RoleName {
  return value && isRoleName(value) ? value : "Organization Admin";
}

function ensureAdminRuntime() {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase admin runtime is required for tenant provisioning.");
  }
}

async function firstOrCreateRole(organizationId: string, role: RoleName) {
  const query = new URLSearchParams({
    organization_id: `eq.${organizationId}`,
    name: `eq.${role}`,
    select: "id",
    limit: "1",
  });
  const existing = await supabaseAdminRest<RoleRow[]>("roles", { query });
  if (existing[0]) return existing[0];

  const created = await supabaseAdminRest<RoleRow[]>("roles", {
    method: "POST",
    body: {
      organization_id: organizationId,
      name: role,
      description: `${role} role`,
    },
  });
  return created[0];
}

async function createDepartment(organizationId: string, departmentName?: string) {
  if (!departmentName?.trim()) return undefined;
  const name = departmentName.trim();
  const created = await supabaseAdminRest<DepartmentRow[]>("departments", {
    method: "POST",
    query: new URLSearchParams({ on_conflict: "organization_id,slug" }),
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      organization_id: organizationId,
      name,
      slug: slugFromOrganizationName(name),
      data_classification: "internal",
    },
  });
  return created[0];
}

async function createWorkspace(organizationId: string, departmentId: string | undefined, workspaceName?: string) {
  if (!workspaceName?.trim()) return undefined;
  const name = workspaceName.trim();
  const created = await supabaseAdminRest<WorkspaceRow[]>("workspaces", {
    method: "POST",
    query: new URLSearchParams({ on_conflict: "organization_id,slug" }),
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      organization_id: organizationId,
      department_id: departmentId ?? null,
      name,
      slug: slugFromOrganizationName(name),
      workspace_type: "department",
      data_classification: "internal",
    },
  });
  return created[0];
}

export async function updateTenantProfile(user: UserContext, input: ProfileInput) {
  ensureAdminRuntime();
  const displayName = input.displayName?.trim() || user.displayName || input.email || user.email || "AXXESS User";
  const email = input.email?.trim().toLowerCase() || user.email || "";
  const cleanedInitials = input.avatarInitials?.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase();
  const avatarInitials = (cleanedInitials && cleanedInitials.length > 0 ? cleanedInitials : undefined) ?? user.avatarInitials ?? initialsForName(displayName);

  await supabaseAdminRest("profiles", {
    method: "POST",
    query: new URLSearchParams({ on_conflict: "id" }),
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      id: user.id,
      email,
      display_name: displayName,
      avatar_initials: avatarInitials,
    },
  });

  const rows = await supabaseAdminRest<Array<{
    id: string;
    organization_id: string;
    email: string;
    display_name: string;
    avatar_initials: string;
    role: string;
    department_name?: string | null;
    title?: string | null;
    timezone?: string | null;
  }>>("users", {
    method: "PATCH",
    query: new URLSearchParams({ id: `eq.${user.id}`, organization_id: `eq.${user.organizationId}` }),
    body: {
      email,
      display_name: displayName,
      avatar_initials: avatarInitials,
      department_name: input.department?.trim() || null,
      title: input.title?.trim() || null,
      timezone: input.timezone?.trim() || "Asia/Kolkata",
    },
  });

  return {
    ...user,
    email,
    displayName,
    avatarInitials,
    department: rows[0]?.department_name ?? input.department ?? user.department,
    title: rows[0]?.title ?? input.title ?? user.title,
    timezone: rows[0]?.timezone ?? input.timezone ?? user.timezone,
  } satisfies UserContext;
}

export async function provisionTenantForUser(user: UserContext, input: TenantProvisioningInput) {
  ensureAdminRuntime();
  const organizationName = input.organizationName.trim();
  if (!organizationName) throw new Error("Organization name is required.");

  // tenant_id has been NOT NULL since 202607090001_sprint12_security_compliance_foundation.sql,
  // which backfilled every existing row as tenant_id = id but added no default for new rows --
  // every brand-new organization signup was failing this constraint outright until a DB-level
  // fix (a BEFORE INSERT trigger defaulting tenant_id to id, see the accompanying migration).
  // Deliberately not set here: passing an explicit id in this upsert body would let the
  // on_conflict(slug) merge path reassign an *existing* organization's primary key if two
  // signups ever raced on the same org name -- the trigger fixes this for every insert path,
  // not just this one call site, without that risk.
  const organizationRows = await supabaseAdminRest<OrganizationRow[]>("organizations", {
    method: "POST",
    query: new URLSearchParams({ on_conflict: "slug" }),
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      name: organizationName,
      slug: slugFromOrganizationName(organizationName),
      sector: normalizeOnboardingSector(input.sector),
      data_residency_region: "india",
      security_tier: "standard",
    },
  });
  const organization = organizationRows[0];
  if (!organization) throw new Error("Organization provisioning did not return a tenant.");

  const role = normalizeOnboardingRole(input.role);
  const department = await createDepartment(organization.id, input.departmentName).catch(() => undefined);
  const workspace = await createWorkspace(organization.id, department?.id, input.workspaceName).catch(() => undefined);
  const displayName = user.displayName || user.email || "AXXESS User";
  const email = user.email ?? "";
  const avatarInitials = user.avatarInitials ?? initialsForName(displayName);

  await supabaseAdminRest("profiles", {
    method: "POST",
    query: new URLSearchParams({ on_conflict: "id" }),
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      id: user.id,
      email,
      display_name: displayName,
      avatar_initials: avatarInitials,
    },
  });

  await supabaseAdminRest("users", {
    method: "POST",
    query: new URLSearchParams({ on_conflict: "id" }),
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      id: user.id,
      organization_id: organization.id,
      email,
      display_name: displayName,
      avatar_initials: avatarInitials,
      role,
      status: "active",
      department_id: department?.id ?? null,
      department_name: input.departmentName?.trim() || null,
      title: user.title ?? null,
      timezone: user.timezone ?? "Asia/Kolkata",
    },
  });

  await supabaseAdminRest("organization_members", {
    method: "POST",
    query: new URLSearchParams({ on_conflict: "organization_id,user_id" }),
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      organization_id: organization.id,
      user_id: user.id,
      title: user.title ?? null,
      status: "active",
    },
  });

  const roleRow = await firstOrCreateRole(organization.id, role);
  if (roleRow) {
    await supabaseAdminRest("user_roles", {
      method: "POST",
      query: new URLSearchParams({ on_conflict: "organization_id,user_id,role_id" }),
      prefer: "resolution=ignore-duplicates,return=representation",
      body: {
        organization_id: organization.id,
        user_id: user.id,
        role_id: roleRow.id,
      },
    });
  }

  if (workspace) {
    await supabaseAdminRest("workspace_members", {
      method: "POST",
      query: new URLSearchParams({ on_conflict: "workspace_id,user_id" }),
      prefer: "resolution=merge-duplicates,return=representation",
      body: {
        organization_id: organization.id,
        workspace_id: workspace.id,
        user_id: user.id,
        role,
        status: "active",
      },
    }).catch(() => undefined);
  }

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      sector: organization.sector,
      createdAt: organization.created_at,
      updatedAt: organization.updated_at,
    } satisfies Organization,
    user: {
      ...user,
      organizationId: organization.id,
      role,
      email,
      displayName,
      avatarInitials,
      department: input.departmentName,
      timezone: user.timezone ?? "Asia/Kolkata",
    } satisfies UserContext,
    departmentId: department?.id,
    workspaceId: workspace?.id,
  };
}
