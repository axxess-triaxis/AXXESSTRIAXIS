export type AgenticSourceType = "rag_answer" | "ai_review" | "external_agent_result" | "recommendation";

export type AgenticFirstAction =
  | "task"
  | "meeting"
  | "reminder"
  | "program"
  | "project"
  | "stakeholder_mapping"
  | "notion_insight"
  | "analytics_dashboard"
  | "slides_ppt"
  | "doc_notion"
  | "sheets_excel"
  | "integrate_next_query"
  | "other"
  | "nothing";

export const AGENTIC_FIRST_ACTIONS: { value: AgenticFirstAction; label: string }[] = [
  { value: "task", label: "Create/edit task" },
  { value: "meeting", label: "Set up/modify/reschedule meeting" },
  { value: "reminder", label: "Create/edit reminder" },
  { value: "program", label: "Create/edit program" },
  { value: "project", label: "Create/edit project" },
  { value: "stakeholder_mapping", label: "Save stakeholder mapping matrix" },
  { value: "notion_insight", label: "Store insights in Notion" },
  { value: "analytics_dashboard", label: "Make analytics dashboard" },
  { value: "slides_ppt", label: "Create slides/PPT" },
  { value: "doc_notion", label: "Create doc/Notion" },
  { value: "sheets_excel", label: "Create Sheets/Excel" },
  { value: "integrate_next_query", label: "Integrate into next query" },
  { value: "other", label: "Other" },
  { value: "nothing", label: "Nothing for now, thank you" },
];

export type AgenticSecondStepId = "create" | "edit" | "cancel" | "reschedule" | "store" | "note_for_now" | "yes" | "no" | "dismiss";

export const AGENTIC_SECOND_STEP: Record<AgenticFirstAction, { id: AgenticSecondStepId; label: string }[]> = {
  task: [{ id: "create", label: "Create" }, { id: "edit", label: "Edit" }],
  meeting: [{ id: "create", label: "Create" }, { id: "cancel", label: "Cancel" }, { id: "reschedule", label: "Reschedule" }],
  reminder: [{ id: "create", label: "Create" }, { id: "edit", label: "Edit" }],
  program: [{ id: "create", label: "Create" }, { id: "edit", label: "Edit" }],
  project: [{ id: "create", label: "Create" }, { id: "edit", label: "Edit" }],
  stakeholder_mapping: [{ id: "store", label: "Store" }, { id: "note_for_now", label: "Note for now" }],
  notion_insight: [{ id: "store", label: "Store" }, { id: "note_for_now", label: "Note for now" }],
  analytics_dashboard: [{ id: "create", label: "Create" }, { id: "edit", label: "Edit" }],
  slides_ppt: [{ id: "create", label: "Create" }, { id: "edit", label: "Edit" }],
  doc_notion: [{ id: "create", label: "Create" }, { id: "edit", label: "Edit" }],
  sheets_excel: [{ id: "create", label: "Create" }, { id: "edit", label: "Edit" }],
  integrate_next_query: [{ id: "yes", label: "Yes" }, { id: "no", label: "No" }],
  other: [],
  nothing: [{ id: "dismiss", label: "Dismiss" }],
};

// Confirmed via direct code research: no real creation flow exists anywhere in this codebase for
// these three. Shown as disabled, honest reasons rather than fabricated success.
export const AGENTIC_UNAVAILABLE_ACTIONS: Partial<Record<AgenticFirstAction, string>> = {
  notion_insight: "Notion integration is not connected yet. This selection is recorded but nothing is stored in Notion.",
  slides_ppt: "Slide/PPT export isn't built yet in AXXESS.",
  sheets_excel: "Spreadsheet/Excel export isn't built yet in AXXESS.",
};

export type AgenticNavSection = "tasks" | "meetings" | "projects" | "stakeholders" | "analytics" | "documents";

// No entry for notion_insight/slides_ppt/sheets_excel (no destination -- resolved in-modal only)
// or "other"/"nothing"/integrate_next_query (handled specially by the caller, never navigated).
export const AGENTIC_ROUTE_FOR_ACTION: Partial<Record<AgenticFirstAction, AgenticNavSection>> = {
  task: "tasks",
  reminder: "tasks",
  meeting: "meetings",
  program: "projects",
  project: "projects",
  stakeholder_mapping: "stakeholders",
  analytics_dashboard: "analytics",
  doc_notion: "documents",
};

// Shown in the destination page's pre-fill banner for actions with no dedicated form of their own.
export const AGENTIC_ROUTE_CAVEAT: Partial<Record<AgenticFirstAction, string>> = {
  program: "AXXESS does not yet have a dedicated Program creation form -- this opens as a new Project you can link to a Program.",
  reminder: "AXXESS does not yet have a dedicated Reminder type -- this opens as a new Task tagged \"reminder.\"",
};

export type AgenticGateSignals = {
  newInformation: boolean;
  newStakeholder: boolean;
  newContext: boolean;
  newTaskMeetingProjectProgramMention: boolean;
  pushbackSeverity: 1 | 2 | 3 | 4 | 5;
};

export type AgenticGateResult = {
  signals: AgenticGateSignals;
  triggerCount: number;
  showPrompt: boolean;
  overrideRequired: boolean;
  compulsoryChoice: boolean;
  hitlClearanceRequired: boolean;
  explicitWarning: boolean;
};

export type AgenticPromptSource = {
  sourceType: AgenticSourceType;
  summary: string;
  citations?: { sourceId: string; title: string }[];
  aiOutputAuditId?: string;
  humanReviewRequired?: boolean;
};

export type AgenticDismissReason =
  | "nothing_option"
  | "second_step"
  | "unavailable_action"
  | "gate_required_no_action_now"
  | "gate_required_no_action_required"
  | "manual_close";

export type AgenticResolution = {
  firstAction: AgenticFirstAction;
  secondStep?: AgenticSecondStepId;
  otherInstruction?: string;
  dismissedVia: AgenticDismissReason;
};

export type AgenticPromptProps = {
  open: boolean;
  firstName: string;
  source: AgenticPromptSource;
  disabledReasons?: Partial<Record<AgenticFirstAction, string>>;
  gateContext?: AgenticGateResult;
  onResolved: (result: AgenticResolution) => void;
  onClose: () => void;
};
