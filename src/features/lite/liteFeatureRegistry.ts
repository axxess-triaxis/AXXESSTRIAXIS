export type LiteFeatureStatus = "live" | "scaffold" | "pending";

export type LiteFeature = {
  id:
    | "dashboard"
    | "meetings"
    | "tasks"
    | "reminders"
    | "projects"
    | "programs"
    | "crmStakeholders"
    | "approvalsGovernance"
    | "settings"
    | "integrations"
    | "aiWorkspace"
    | "auditCompliance"
    | "documentsKnowledgeHub"
    | "analytics";
  label: string;
  route: string;
  status: LiteFeatureStatus;
  webAllowed: true;
  mobileAllowed: boolean;
};

export const liteFeatureLimit = 14;

export const liteFeatures: LiteFeature[] = [
  { id: "dashboard", label: "Home", route: "/lite", status: "live", webAllowed: true, mobileAllowed: true },
  { id: "meetings", label: "Meetings", route: "/lite/meetings", status: "scaffold", webAllowed: true, mobileAllowed: true },
  { id: "tasks", label: "Tasks", route: "/lite/work", status: "scaffold", webAllowed: true, mobileAllowed: true },
  { id: "reminders", label: "Reminders", route: "/lite/work", status: "scaffold", webAllowed: true, mobileAllowed: true },
  { id: "projects", label: "Projects", route: "/lite/projects", status: "scaffold", webAllowed: true, mobileAllowed: true },
  { id: "programs", label: "Programs", route: "/lite/projects", status: "scaffold", webAllowed: true, mobileAllowed: true },
  { id: "crmStakeholders", label: "People", route: "/lite/people", status: "scaffold", webAllowed: true, mobileAllowed: true },
  { id: "approvalsGovernance", label: "Approvals", route: "/lite/work", status: "scaffold", webAllowed: true, mobileAllowed: true },
  { id: "settings", label: "Settings", route: "/lite/settings", status: "live", webAllowed: true, mobileAllowed: true },
  { id: "integrations", label: "Integrations", route: "/lite/settings", status: "pending", webAllowed: true, mobileAllowed: false },
  { id: "aiWorkspace", label: "Ask AXXESS", route: "/lite/ask", status: "scaffold", webAllowed: true, mobileAllowed: true },
  { id: "auditCompliance", label: "Audit Export", route: "/lite/settings", status: "pending", webAllowed: true, mobileAllowed: false },
  { id: "documentsKnowledgeHub", label: "Files", route: "/lite/files", status: "scaffold", webAllowed: true, mobileAllowed: true },
  { id: "analytics", label: "Simple Analytics", route: "/lite", status: "pending", webAllowed: true, mobileAllowed: false },
];
