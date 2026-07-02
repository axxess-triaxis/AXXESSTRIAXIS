import type { NavGroup, NavSection } from "../app/navigation";
import type { AppRoute } from "../app/routing/routes";
import type { Role } from "../domain";

export type MockUserContext = {
  id: string;
  organizationId: string;
  role: Role["name"];
};

const sectionPermissions: Record<NavSection, Role["name"][]> = {
  dashboard: ["Super Admin", "Organization Admin", "Executive", "Manager", "Employee", "External Partner", "Consultant", "Guest"],
  "ai-workspace": ["Super Admin", "Organization Admin", "Executive", "Manager", "Employee", "Consultant"],
  projects: ["Super Admin", "Organization Admin", "Executive", "Manager", "Employee", "External Partner", "Consultant"],
  tasks: ["Super Admin", "Organization Admin", "Executive", "Manager", "Employee", "External Partner", "Consultant"],
  stakeholders: ["Super Admin", "Organization Admin", "Executive", "Manager", "Consultant"],
  knowledge: ["Super Admin", "Organization Admin", "Executive", "Manager", "Employee", "External Partner", "Consultant", "Guest"],
  documents: ["Super Admin", "Organization Admin", "Executive", "Manager", "Employee", "External Partner", "Consultant", "Guest"],
  meetings: ["Super Admin", "Organization Admin", "Executive", "Manager", "Employee", "External Partner", "Consultant"],
  approvals: ["Super Admin", "Organization Admin", "Executive", "Manager"],
  analytics: ["Super Admin", "Organization Admin", "Executive", "Manager", "Consultant"],
  integrations: ["Super Admin", "Organization Admin"],
  settings: ["Super Admin", "Organization Admin"],
};

// Mocked for Sprint 3. The auth facade reads this until Supabase Auth is enabled
// behind a feature flag.
export const mockCurrentUserContext: MockUserContext = {
  id: "user_raj_anand",
  organizationId: "org_public_safety",
  role: "Organization Admin",
};

export function canAccessSection(user: MockUserContext, section: NavSection) {
  return sectionPermissions[section].includes(user.role);
}

export function canAccessRoute(user: MockUserContext, route: AppRoute) {
  if (route.access === "guest") return true;
  if (route.requiredRoles?.length) return route.requiredRoles.includes(user.role);
  return canAccessSection(user, route.section);
}

export function getVisibleNavGroups(groups: NavGroup[], user: MockUserContext): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessSection(user, item.id)),
    }))
    .filter((group) => group.items.length > 0);
}
