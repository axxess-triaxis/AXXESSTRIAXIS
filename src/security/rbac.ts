import type { NavGroup, NavSection } from "../app/navigation";
import type { AppRoute } from "../app/routing/routes";
import type { RoleName } from "../domain";

export type UserContext = {
  id: string;
  organizationId: string;
  role: RoleName;
  email?: string;
  displayName?: string;
  avatarInitials?: string;
  // MN-8 (2026-08-24): Supabase Storage path in axxess-avatars, not a public URL. avatarInitials
  // remains the fallback everywhere no DP is set.
  avatarPath?: string;
  // MN-8 (2026-08-24): self-reported label only -- no visibility/access-control logic anywhere
  // reads this field, user-set manually, never inferred. Optional here (unlike the domain User
  // type, where it's required) since not every code path constructing a UserContext has it yet.
  availability?: "public" | "private" | "inactive";
  department?: string;
  title?: string;
  timezone?: string;
  // A-84 (2026-08-02): the phone number linked to this Supabase Auth identity, if any (via
  // linkPhoneStartServerSide/linkPhoneVerifyServerSide) -- read directly from Supabase's own user
  // object, not a separate public.users column. Absent if no phone has been linked.
  phone?: string;
  // True for a real, Supabase-authenticated identity that has not yet completed organization
  // provisioning (no corresponding public.users row exists yet). Callers must route this user to
  // /onboarding rather than any page that queries live repositories by organizationId -- it is not
  // a real tenant id and Postgres will reject it as an invalid uuid.
  needsOnboarding?: boolean;
};

export type MockUserContext = UserContext;

const sectionPermissions: Record<NavSection, RoleName[]> = {
  dashboard: ["Super Admin", "Organization Admin", "Executive", "Manager", "Employee", "Consultant", "Guest"],
  "ai-workspace": ["Super Admin", "Organization Admin", "Executive", "Manager", "Employee"],
  projects: ["Super Admin", "Organization Admin", "Executive", "Manager", "Employee", "Consultant"],
  tasks: ["Super Admin", "Organization Admin", "Executive", "Manager", "Employee", "Consultant"],
  stakeholders: ["Super Admin", "Organization Admin", "Executive", "Manager"],
  knowledge: ["Super Admin", "Organization Admin", "Executive", "Manager", "Employee", "Consultant", "Guest"],
  documents: ["Super Admin", "Organization Admin", "Executive", "Manager", "Employee", "Consultant", "Guest"],
  meetings: ["Super Admin", "Organization Admin", "Executive", "Manager", "Employee", "Consultant"],
  alerts: ["Super Admin", "Organization Admin", "Executive", "Manager", "Employee", "Consultant"],
  approvals: ["Super Admin", "Organization Admin", "Executive", "Manager"],
  "audit-logs": ["Super Admin", "Organization Admin"],
  analytics: ["Super Admin", "Organization Admin", "Executive", "Manager"],
  "product-analytics": ["Super Admin", "Organization Admin"],
  "pilot-conversion": ["Super Admin", "Organization Admin"],
  "organization-admin": ["Super Admin", "Organization Admin"],
  integrations: ["Super Admin", "Organization Admin"],
  settings: ["Super Admin", "Organization Admin", "Executive", "Manager"],
  "beta-readiness": ["Super Admin", "Organization Admin"],
};

// Mocked for Sprint 3. The auth facade reads this until Supabase Auth is enabled
// behind a feature flag.
export const mockCurrentUserContext: MockUserContext = {
  id: "user_demo_executive",
  organizationId: "org_north_east_health_mission",
  role: "Organization Admin",
  email: "investor.preview@axxess.demo",
  displayName: "Ananya Rao",
  avatarInitials: "AR",
  department: "Mission Secretariat",
  title: "Investor Preview Lead",
  timezone: "Asia/Kolkata",
};

export function isRoleName(value: string): value is RoleName {
  return ["Super Admin", "Organization Admin", "Executive", "Manager", "Employee", "Consultant", "Guest"].includes(value);
}

// The API and the page guard read these same rules, so a page saying "Access restricted" and the
// route behind it cannot disagree. RLS holds the matching rules for direct database calls, see
// supabase/migrations/20261106130000_api_role_checks.sql. Change both together.
const seniorRoles: RoleName[] = ["Super Admin", "Organization Admin", "Executive", "Manager"];
const staffRoles: RoleName[] = [...seniorRoles, "Employee"];

const capabilityPermissions = {
  "crm.read": staffRoles,
  "crm.create": staffRoles,
  // Manager is here for the finance head, because AXXESS has no finance role yet.
  "financial-watch": seniorRoles,
  stakeholders: staffRoles,
  "email-import": staffRoles,
  "workflow-timeline": staffRoles,
  // Counts of what happened across the whole tenant, so outside roles get nothing here.
  "tenant-activity": staffRoles,
} satisfies Record<string, RoleName[]>;

export type ApiCapability = keyof typeof capabilityPermissions;

export function canUseCapability(role: RoleName, capability: ApiCapability) {
  return capabilityPermissions[capability].includes(role);
}

// An Employee may use the CRM, but sees only their own leads.
export function canReadAllLeads(role: RoleName) {
  return seniorRoles.includes(role);
}

export function canAccessSection(user: UserContext, section: NavSection) {
  return sectionPermissions[section].includes(user.role);
}

export function canAccessRoute(user: UserContext, route: AppRoute) {
  if (route.access === "guest") return true;
  if (route.requiredRoles?.length) return route.requiredRoles.includes(user.role);
  return canAccessSection(user, route.section);
}

// "Super Admin" is a self-selectable role within a tenant's own onboarding (see
// packages/shared/src/index.ts axxessBetaRoles), not a cross-tenant platform-operator role --
// there is no such role in this codebase. Granting it authority over an arbitrary organizationId
// here previously let a caller manage any tenant by simply naming its id, backstopped only by
// Postgres RLS (which is correctly scoped per docs/readiness/ACTIONABLES_READINESS_MATRIX.md
// Sprint 3 tenant-model audit). Both roles must always match the acting user's own organization.
// L16: Organization Admins manage every role except the one above them. The database enforces the same
// rule (guard_super_admin_* triggers); this gives the API a clean 403.
export function canGrantRole(actorRole: RoleName, grantedRole: RoleName) {
  return grantedRole !== "Super Admin" || actorRole === "Super Admin";
}

export function canManageOrganization(user: UserContext, organizationId: string) {
  if (user.organizationId !== organizationId) return false;
  return user.role === "Super Admin" || user.role === "Organization Admin";
}

export function assertOrganizationAccess(user: UserContext, organizationId: string) {
  if (user.organizationId !== organizationId) {
    throw new Error("Cross-organization access denied.");
  }
}

// Sprint 1 pilot portfolio (2026-08-15): the one deliberate, narrow exception to
// canManageOrganization's "always same-tenant" rule above. Founder requirement: only Triaxis
// Ventures' own operating org's own Super Admin may see a cross-tenant rollup of pilot customer
// orgs -- never "any tenant's Super Admin sees all tenants." Both the acting user's role AND their
// organizationId matching the platform operator's real org id (env-configured, never hardcoded,
// never NEXT_PUBLIC_) are required. Fails closed if the env var is unset.
export function canViewCrossTenantPilotPortfolio(user: UserContext, env: NodeJS.ProcessEnv = process.env): boolean {
  const operatorOrgId = env.AXXESS_PLATFORM_OPERATOR_ORGANIZATION_ID;
  if (!operatorOrgId) return false;
  return user.role === "Super Admin" && user.organizationId === operatorOrgId;
}

export function getVisibleNavGroups(groups: NavGroup[], user: UserContext): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessSection(user, item.id)),
    }))
    .filter((group) => group.items.length > 0);
}
