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
  department?: string;
  title?: string;
  timezone?: string;
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

export function canAccessSection(user: UserContext, section: NavSection) {
  return sectionPermissions[section].includes(user.role);
}

export function canAccessRoute(user: UserContext, route: AppRoute) {
  if (route.access === "guest") return true;
  if (route.requiredRoles?.length) return route.requiredRoles.includes(user.role);
  return canAccessSection(user, route.section);
}

export function canManageOrganization(user: UserContext, organizationId: string) {
  if (user.role === "Super Admin") return true;
  return user.organizationId === organizationId && user.role === "Organization Admin";
}

export function assertOrganizationAccess(user: UserContext, organizationId: string) {
  if (user.role !== "Super Admin" && user.organizationId !== organizationId) {
    throw new Error("Cross-organization access denied.");
  }
}

export function getVisibleNavGroups(groups: NavGroup[], user: UserContext): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessSection(user, item.id)),
    }))
    .filter((group) => group.items.length > 0);
}
