// XL-5 (2026-08-06): moved here from src/features/lite/liteFeatureRegistry.ts -- Phase 1 of the
// shared-core extraction (docs/readiness/AXXESS_LITE_SHARED_CORE_EXTRACTION_PLAN_2026_08_06.md).
// Pure data, zero imports -- a genuinely low-risk first move. The old location now re-exports from
// here so any existing consumer keeps working unchanged.
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

// XL-6 (2026-08-06): statuses updated to reflect the daily-use loop -- tasks/reminders, meetings,
// contacts, and Ask AXXESS are now wired to real, tenant-scoped repository calls (not fabricated
// data), so they moved from "scaffold" to "live". projects/programs, approvalsGovernance,
// documentsKnowledgeHub (Files), integrations, auditCompliance, and analytics are unchanged --
// still honest placeholders, per the XL-6 closeout's "What Remains Scaffold/Pending" section.
export const liteFeatures: LiteFeature[] = [
  { id: "dashboard", label: "Home", route: "/lite", status: "live", webAllowed: true, mobileAllowed: true },
  { id: "meetings", label: "Meetings", route: "/lite/meetings", status: "live", webAllowed: true, mobileAllowed: true },
  { id: "tasks", label: "Tasks", route: "/lite/work", status: "live", webAllowed: true, mobileAllowed: true },
  { id: "reminders", label: "Reminders", route: "/lite/work", status: "live", webAllowed: true, mobileAllowed: true },
  { id: "projects", label: "Projects", route: "/lite/projects", status: "scaffold", webAllowed: true, mobileAllowed: true },
  { id: "programs", label: "Programs", route: "/lite/projects", status: "scaffold", webAllowed: true, mobileAllowed: true },
  { id: "crmStakeholders", label: "People", route: "/lite/people", status: "live", webAllowed: true, mobileAllowed: true },
  { id: "approvalsGovernance", label: "Approvals", route: "/lite/work", status: "scaffold", webAllowed: true, mobileAllowed: true },
  { id: "settings", label: "Settings", route: "/lite/settings", status: "live", webAllowed: true, mobileAllowed: true },
  { id: "integrations", label: "Integrations", route: "/lite/settings", status: "pending", webAllowed: true, mobileAllowed: false },
  { id: "aiWorkspace", label: "Ask AXXESS", route: "/lite/ask", status: "live", webAllowed: true, mobileAllowed: true },
  { id: "auditCompliance", label: "Audit Export", route: "/lite/settings", status: "pending", webAllowed: true, mobileAllowed: false },
  { id: "documentsKnowledgeHub", label: "Files", route: "/lite/files", status: "scaffold", webAllowed: true, mobileAllowed: true },
  { id: "analytics", label: "Simple Analytics", route: "/lite", status: "pending", webAllowed: true, mobileAllowed: false },
];
