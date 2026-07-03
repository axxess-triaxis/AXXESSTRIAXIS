import type { NavSection } from "../navigation";
import type { RoleName } from "../../domain";

export type AppRoute = {
  id: string;
  section: NavSection;
  path: string;
  label: string;
  module: string;
  description: string;
  access: "guest" | "authenticated" | "role-protected" | "organization-protected";
  requiresAuth: boolean;
  requiredRoles?: RoleName[];
};

// Route metadata is intentionally framework-light for Sprint 3. It gives us the
// same routing contract React Router would consume, while preserving static-file
// deployment and leaving the door open for a router swap later.
export const appRoutes: AppRoute[] = [
  { id: "app", section: "dashboard", path: "app", label: "Executive Dashboard", module: "dashboard", description: "Authenticated workspace entry", access: "authenticated", requiresAuth: true },
  { id: "dashboard", section: "dashboard", path: "dashboard", label: "Executive Dashboard", module: "dashboard", description: "Executive portfolio overview", access: "organization-protected", requiresAuth: true },
  { id: "ai-workspace", section: "ai-workspace", path: "ai-workspace", label: "AI Workspace", module: "ai-workspace", description: "Human-in-the-loop institutional workspace", access: "organization-protected", requiresAuth: true },
  { id: "projects", section: "projects", path: "projects", label: "Projects & Programs", module: "projects", description: "Program and project execution", access: "organization-protected", requiresAuth: true },
  { id: "programs", section: "projects", path: "programs", label: "Programs", module: "projects", description: "Program portfolio route mapped to projects module", access: "organization-protected", requiresAuth: true },
  { id: "tasks", section: "tasks", path: "tasks", label: "Tasks & Workflow", module: "tasks", description: "Task execution and workflow", access: "organization-protected", requiresAuth: true },
  { id: "crm", section: "stakeholders", path: "crm", label: "CRM", module: "stakeholders", description: "CRM route mapped to stakeholder intelligence", access: "organization-protected", requiresAuth: true },
  { id: "stakeholders", section: "stakeholders", path: "stakeholders", label: "Stakeholders & CRM", module: "stakeholders", description: "Stakeholder relationship intelligence", access: "organization-protected", requiresAuth: true },
  { id: "knowledge", section: "knowledge", path: "knowledge", label: "Institutional Knowledge", module: "knowledge", description: "Knowledge graph and semantic discovery", access: "organization-protected", requiresAuth: true },
  { id: "documents", section: "documents", path: "documents", label: "Documents & Files", module: "documents", description: "Document intelligence and file registry", access: "organization-protected", requiresAuth: true },
  { id: "meetings", section: "meetings", path: "meetings", label: "Meetings & Decisions", module: "meetings", description: "Meetings, summaries, and decisions", access: "organization-protected", requiresAuth: true },
  { id: "analytics", section: "analytics", path: "analytics", label: "Analytics & Reports", module: "analytics", description: "Executive reporting and insights", access: "organization-protected", requiresAuth: true },
  { id: "settings", section: "settings", path: "settings", label: "Settings", module: "settings", description: "Organization and security configuration", access: "organization-protected", requiresAuth: true },
  { id: "admin", section: "settings", path: "admin", label: "Admin", module: "settings", description: "Administrative route guard architecture", access: "role-protected", requiresAuth: true, requiredRoles: ["Super Admin", "Organization Admin"] },
  { id: "auth", section: "dashboard", path: "auth", label: "Authentication", module: "auth", description: "Guest authentication route placeholder", access: "guest", requiresAuth: false },
];

export function routeForSection(section: NavSection) {
  return appRoutes.find((route) => route.section === section && route.id === section) ?? appRoutes.find((route) => route.section === section) ?? appRoutes[1];
}

export function routeForPath(pathname: string) {
  const normalized = pathname.replace(/^\/+/, "").split("/")[0] || "dashboard";
  return appRoutes.find((route) => route.path === normalized) ?? appRoutes[1];
}

export function sectionFromPath(pathname: string): NavSection {
  return routeForPath(pathname).section;
}

export function sectionFromHash(hash: string): NavSection {
  const normalized = hash.replace(/^#\/?/, "");
  return appRoutes.find((route) => route.path === normalized)?.section ?? "dashboard";
}
