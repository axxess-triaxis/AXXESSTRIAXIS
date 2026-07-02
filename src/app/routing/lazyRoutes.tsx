import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { NavSection } from "../navigation";

type LazyRouteComponent = LazyExoticComponent<ComponentType>;

// Route modules are lazy-loaded so the dashboard shell is not forced to ship
// every operational screen, chart, and workflow at first paint.
export const lazyRouteComponents: Record<NavSection, LazyRouteComponent> = {
  dashboard: lazy(() => import("../../features/dashboard/DashboardSection").then((module) => ({ default: module.DashboardSection }))),
  "ai-workspace": lazy(() => import("../../features/ai-workspace/AIWorkspaceSection")),
  projects: lazy(() => import("../../features/projects/ProjectsSection")),
  tasks: lazy(() => import("../../features/tasks/TasksSection")),
  stakeholders: lazy(() => import("../../features/stakeholders/StakeholdersSection")),
  knowledge: lazy(() => import("../../features/knowledge/KnowledgeSection")),
  documents: lazy(() => import("../../features/documents/DocumentsSection")),
  meetings: lazy(() => import("../../features/meetings/MeetingsSection")),
  approvals: lazy(() => import("../../features/approvals/ApprovalsSection")),
  analytics: lazy(() => import("../../features/analytics/AnalyticsSection")),
  integrations: lazy(() => import("../../features/integrations/IntegrationsSection")),
  settings: lazy(() => import("../../features/settings/SettingsSection")),
};
