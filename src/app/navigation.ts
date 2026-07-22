import { BarChart3, BellRing, BookOpen, Brain, Building2, CalendarDays, CheckSquare, ClipboardCheck, FileText, FolderKanban, LayoutDashboard, Plug, ScrollText, Settings, ShieldCheck, TrendingUp, Users } from "lucide-react";

export type NavSection =
  | "dashboard" | "ai-workspace" | "projects" | "tasks"
  | "stakeholders" | "knowledge" | "documents" | "meetings"
  | "approvals" | "audit-logs" | "analytics" | "product-analytics" | "pilot-conversion" | "alerts" | "organization-admin" | "integrations" | "settings" | "beta-readiness";

export type NavItem = {
  id: NavSection;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  // "tag" badges (e.g. "AI") are static feature labels, safe to show regardless of tenant state.
  // "count" badges represent a tenant-state count and must only render in Demo Mode -- no live
  // repository currently backs Social Alerts or Approvals (see DEMO_DATA_LEAKAGE_AUDIT.md), so
  // showing a hardcoded count to a live tenant would contradict their actual (empty) state.
  // Defaults to "count" when a badge is present, since that's the riskier case to get wrong.
  //
  // Sprint 5 badge-count strategy decision (Option A, confirmed): hide the count in live mode
  // rather than build a live counting repository (Option B). Neither Social Alerts nor Approvals
  // has a live, tenant-scoped data source to count from yet -- getLiveWorkspaceMetrics's own
  // socialAlerts field is hardcoded to 0 with an explicit "no live repository exists yet" comment
  // (src/services/live-platform/livePlatform.ts), and Approvals is a Demo-Mode-gated stub with no
  // repository at all (per Sprint 3's audit). Building a real counting source for either is a
  // product feature addition, not a bug fix, and out of this program's "do not rewrite architecture"
  // scope. Revisit this decision (switch to Option B) only once a live repository backs one of them.
  badgeKind?: "tag" | "count";
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { id: "dashboard" as NavSection, label: "Executive Dashboard", icon: LayoutDashboard },
      { id: "ai-workspace" as NavSection, label: "AI Workspace", icon: Brain, badge: "AI", badgeKind: "tag" },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "projects" as NavSection, label: "Projects & Programs", icon: FolderKanban },
      { id: "tasks" as NavSection, label: "Tasks & Workflow", icon: CheckSquare },
      { id: "meetings" as NavSection, label: "Meetings & Decisions", icon: CalendarDays },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { id: "knowledge" as NavSection, label: "Knowledge Hub", icon: BookOpen },
      { id: "documents" as NavSection, label: "Documents & Files", icon: FileText },
      { id: "analytics" as NavSection, label: "Analytics & Reports", icon: BarChart3 },
      { id: "alerts" as NavSection, label: "Social Alerts", icon: BellRing, badge: "4", badgeKind: "count" },
    ],
  },
  {
    label: "Relationships",
    items: [{ id: "stakeholders" as NavSection, label: "Stakeholders & CRM", icon: Users }],
  },
  {
    label: "Governance",
    items: [
      { id: "approvals" as NavSection, label: "Approvals & Governance", icon: ShieldCheck, badge: "23", badgeKind: "count" },
      { id: "audit-logs" as NavSection, label: "Audit Logs", icon: ScrollText },
      { id: "product-analytics" as NavSection, label: "Product Analytics", icon: BarChart3 },
      { id: "pilot-conversion" as NavSection, label: "Pilot Conversion", icon: TrendingUp },
    ],
  },
  {
    label: "Admin",
    items: [
      { id: "organization-admin" as NavSection, label: "Organization Admin", icon: Building2 },
      { id: "integrations" as NavSection, label: "Integrations", icon: Plug },
      { id: "settings" as NavSection, label: "Settings", icon: Settings },
      { id: "beta-readiness" as NavSection, label: "Beta Readiness", icon: ClipboardCheck },
    ],
  },
];
