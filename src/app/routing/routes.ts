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
  { id: "knowledge", section: "knowledge", path: "knowledge", label: "Knowledge Hub", module: "knowledge", description: "Enterprise documents, articles, and knowledge discovery", access: "organization-protected", requiresAuth: true },
  { id: "documents", section: "documents", path: "documents", label: "Documents & Files", module: "documents", description: "Enterprise document registry and storage", access: "organization-protected", requiresAuth: true },
  { id: "meetings", section: "meetings", path: "meetings", label: "Meetings & Decisions", module: "meetings", description: "Meetings, summaries, and decisions", access: "organization-protected", requiresAuth: true },
  { id: "alerts", section: "alerts", path: "alerts", label: "Social Alerts", module: "alerts", description: "Provider-gated social, RSS, manual, and demo signal ingestion", access: "organization-protected", requiresAuth: true },
  { id: "analytics", section: "analytics", path: "analytics", label: "Analytics & Reports", module: "analytics", description: "Executive reporting and insights", access: "organization-protected", requiresAuth: true },
  { id: "audit-logs", section: "audit-logs", path: "admin/audit-logs", label: "Audit Logs", module: "audit-logs", description: "Tenant audit trail, export readiness, and integrity review", access: "role-protected", requiresAuth: true, requiredRoles: ["Super Admin", "Organization Admin"] },
  { id: "product-analytics", section: "product-analytics", path: "admin/product-analytics", label: "Product Analytics", module: "product-analytics", description: "Internal product usage and activation dashboard", access: "role-protected", requiresAuth: true, requiredRoles: ["Super Admin", "Organization Admin"] },
  { id: "pilot-conversion", section: "pilot-conversion", path: "admin/pilot-conversion", label: "Pilot Conversion", module: "pilot-conversion", description: "Pilot readiness events, health score, and conversion controls", access: "role-protected", requiresAuth: true, requiredRoles: ["Super Admin", "Organization Admin"] },
  { id: "organization-admin", section: "organization-admin", path: "admin/organization", label: "Organization Admin", module: "organization-admin", description: "Tenant profile, users, roles, departments, and pilot setup", access: "role-protected", requiresAuth: true, requiredRoles: ["Super Admin", "Organization Admin"] },
  { id: "settings", section: "settings", path: "settings", label: "Settings", module: "settings", description: "Organization and security configuration", access: "organization-protected", requiresAuth: true },
  { id: "admin", section: "settings", path: "admin", label: "Admin", module: "settings", description: "Administrative route guard architecture", access: "role-protected", requiresAuth: true, requiredRoles: ["Super Admin", "Organization Admin"] },
  { id: "beta-readiness", section: "beta-readiness", path: "admin/beta-readiness", label: "Beta Readiness", module: "beta-readiness", description: "Internal beta readiness and pilot launch checks", access: "role-protected", requiresAuth: true, requiredRoles: ["Super Admin", "Organization Admin"] },
  { id: "auth", section: "dashboard", path: "auth", label: "Authentication", module: "auth", description: "Guest authentication and investor preview entry", access: "guest", requiresAuth: false },
];

export function routeForSection(section: NavSection) {
  return appRoutes.find((route) => route.section === section && route.id === section) ?? appRoutes.find((route) => route.section === section) ?? appRoutes[1];
}

export function routeForPath(pathname: string) {
  const normalized = pathname.replace(/^\/+/, "").replace(/\/+$/, "") || "dashboard";
  const firstSegment = normalized.split("/")[0];
  return appRoutes.find((route) => route.path === normalized) ?? appRoutes.find((route) => route.path === firstSegment) ?? appRoutes[1];
}

export function sectionFromPath(pathname: string): NavSection {
  return routeForPath(pathname).section;
}

export function sectionFromHash(hash: string): NavSection {
  const normalized = hash.replace(/^#\/?/, "");
  return appRoutes.find((route) => route.path === normalized)?.section ?? "dashboard";
}
