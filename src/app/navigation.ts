import { BarChart3, BellRing, BookOpen, Brain, CalendarDays, CheckSquare, ClipboardCheck, FileText, FolderKanban, LayoutDashboard, Plug, Settings, ShieldCheck, Users } from "lucide-react";

export type NavSection =
  | "dashboard" | "ai-workspace" | "projects" | "tasks"
  | "stakeholders" | "knowledge" | "documents" | "meetings"
  | "approvals" | "analytics" | "product-analytics" | "alerts" | "integrations" | "settings" | "beta-readiness";

export type NavItem = {
  id: NavSection;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
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
      { id: "ai-workspace" as NavSection, label: "AI Workspace", icon: Brain, badge: "AI" },
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
      { id: "alerts" as NavSection, label: "Social Alerts", icon: BellRing, badge: "4" },
    ],
  },
  {
    label: "Relationships",
    items: [{ id: "stakeholders" as NavSection, label: "Stakeholders & CRM", icon: Users }],
  },
  {
    label: "Governance",
    items: [
      { id: "approvals" as NavSection, label: "Approvals & Governance", icon: ShieldCheck, badge: "23" },
      { id: "product-analytics" as NavSection, label: "Product Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Admin",
    items: [
      { id: "integrations" as NavSection, label: "Integrations", icon: Plug },
      { id: "settings" as NavSection, label: "Settings", icon: Settings },
      { id: "beta-readiness" as NavSection, label: "Beta Readiness", icon: ClipboardCheck },
    ],
  },
];
