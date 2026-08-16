// Sprint 1 agentic chatbot (2026-08-16): synthesizes a narrow, request-scoped AgentScope from the
// real human's own TenantScope + RoleName so the chatbot's agentic loop (agenticChatLoop.ts) can
// reuse the existing 15-tool dispatch triad (getAgentTool/validateAgentToolArguments/tool.handler,
// toolRegistry.ts) that is otherwise built for external agents under AgentScope, a service-role
// credential with no live human session behind it.
//
// This scope is NEVER persisted to agent_connections/agent_action_grants/agent_pending_tool_calls --
// it exists only for the lifetime of one agentic-chat HTTP request. Widening AgentProviderId with
// "axxess_copilot_inapp" (agentScope.ts) is therefore safe/additive with no migration or
// CHECK-constraint concern.
//
// Core rule, enforced below and covered by chatbotAgentScope.test.ts: never grant a capability this
// role could not already reach via the real app UI. canAccessSection (rbac.ts) is reused, not
// reimplemented, as the single source of truth for that boundary.
import type { NavSection } from "../app/navigation";
import type { RoleName } from "../domain";
import type { TenantScope } from "../repositories/interfaces";
import { canAccessSection, type UserContext } from "./rbac";
import type { AgentCapability, AgentScope } from "./agentScope";

// Every capability's requisite NavSection. query_external_model has none -- it is withheld from
// every role unconditionally this sprint (see below), not mapped to a section.
const capabilitySection: Record<Exclude<AgentCapability, "query_external_model">, NavSection> = {
  create_task: "tasks",
  list_tasks: "tasks",
  update_task_status: "tasks",
  list_projects: "projects",
  create_project: "projects",
  list_meetings: "meetings",
  create_meeting: "meetings",
  list_stakeholders: "stakeholders",
  create_stakeholder: "stakeholders",
  add_stakeholder_note: "stakeholders",
  query_knowledge_hub: "knowledge",
  list_documents: "documents",
  get_dashboard_snapshot: "dashboard",
  search_audit_logs: "audit-logs",
};

// query_external_model is deliberately excluded from this table -- nested-LLM recursion/budget risk
// from letting the chatbot's own model call another model through a tool is not modeled yet.
const chatbotEligibleCapabilities: Exclude<AgentCapability, "query_external_model">[] =
  Object.keys(capabilitySection) as Exclude<AgentCapability, "query_external_model">[];

// The role parameter is deliberately separate from tenantScope.role: the caller (the agentic-chat
// route) fetches the acting user's authoritative UserContext.role fresh for this request rather than
// trusting whatever role a TenantScope built earlier for repository calls happens to carry -- capability
// synthesis always uses this explicit, freshly-verified role as its source of truth.
export function synthesizeChatbotAgentScope(tenantScope: TenantScope, role: RoleName): AgentScope {
  const user: UserContext = { id: tenantScope.userId, organizationId: tenantScope.organizationId, role };

  const capabilities = chatbotEligibleCapabilities.filter((capability) =>
    canAccessSection(user, capabilitySection[capability]));

  return {
    organizationId: tenantScope.organizationId,
    // Clearly synthetic -- never a real agent_connections row id.
    agentConnectionId: `inapp:${tenantScope.userId}`,
    provider: "axxess_copilot_inapp",
    capabilities,
    issuedByUserId: tenantScope.userId,
    issuedByRole: role,
  };
}
