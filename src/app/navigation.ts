import { BarChart3, BookOpen, Brain, CalendarDays, CheckSquare, FileText, FolderKanban, LayoutDashboard, Plug, Settings, ShieldCheck, Users } from "lucide-react";

export type NavSection =
  | "dashboard" | "ai-workspace" | "projects" | "tasks"
  | "stakeholders" | "knowledge" | "documents" | "meetings"
  | "approvals" | "analytics" | "integrations" | "settings";

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
    items: [{ id: "dashboard" as NavSection, label: "Executive Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Operations",
    items: [
      { id: "ai-workspace" as NavSection, label: "AI Workspace", icon: Brain, badge: "156" },
      { id: "projects" as NavSection, label: "Projects & Programs", icon: FolderKanban },
      { id: "tasks" as NavSection, label: "Tasks & Workflow", icon: CheckSquare },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { id: "knowledge" as NavSection, label: "Institutional Knowledge", icon: BookOpen },
      { id: "documents" as NavSection, label: "Documents & Files", icon: FileText },
      { id: "meetings" as NavSection, label: "Meetings & Decisions", icon: CalendarDays },
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
      { id: "analytics" as NavSection, label: "Analytics & Reports", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    items: [
      { id: "integrations" as NavSection, label: "Integrations", icon: Plug },
      { id: "settings" as NavSection, label: "Settings", icon: Settings },
    ],
  },
];

