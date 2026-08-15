import type { NavSection } from "../../app/navigation";
import type { tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";

// The 6 actions the chatbot can execute directly (routed through applicationServices, the same
// service layer the real forms use -- see chatCommandRegistry.ts). Anything else the model detects
// falls back to the existing draft-handoff pattern (agenticDraftHandoff.ts).
export type ChatCommandAction =
  | "create_task"
  | "create_meeting"
  | "create_project"
  | "create_stakeholder"
  | "update_task_status"
  | "add_stakeholder_note";

export type ChatCommandResult =
  | { ok: true; entityId: string; entityLabel: string }
  | { ok: false; error: string };

export type ChatCommandDefinition = {
  action: ChatCommandAction;
  section: NavSection;
  summarize: (args: Record<string, unknown>) => string;
  execute: (scope: ReturnType<typeof tenantScopeFromUser>, args: Record<string, unknown>) => Promise<ChatCommandResult>;
};

// The model's parsed response. "command" is intentionally not narrowed to ChatCommandAction here --
// the model may also propose an action outside the 6 directly-executable ones (e.g. "program",
// "slides_ppt"), which chatCommandRegistry won't find, triggering the draft-handoff fallback.
export type ChatIntentResult =
  | { type: "chat"; reply: string }
  | { type: "command"; action: string; args: Record<string, unknown>; reply: string };
