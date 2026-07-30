// Agentic Infrastructure Phase 1 (2026-07-30): a parallel scope for inbound MCP callers, deliberately
// not folded into RoleName/UserContext -- every existing RBAC gate assumes a human actor (see
// src/domain/entities.ts RoleName), and forcing agents into that enum would require new branches
// throughout the codebase for a caller type that isn't a human at all. AgentScope is used only by
// the inbound agent code path (src/app/api/agents/mcp/route.ts and src/services/agents/*).

export type AgentProviderId = "openai" | "anthropic" | "microsoft_copilot";

export const agentProviderIds: AgentProviderId[] = ["openai", "anthropic", "microsoft_copilot"];

export type AgentCapability =
  | "create_task"
  | "query_knowledge_hub"
  | "list_projects"
  // Phase 2 (2026-07-30):
  | "create_meeting"
  | "create_project"
  | "list_stakeholders"
  | "create_stakeholder"
  | "query_external_model";

// Every connection is granted every registered tool -- no per-tenant capability toggle UI yet
// (explicitly deferred in the approved plan). Kept as an array on the row/scope now so a future
// toggle UI only needs to change what's written here, not the shape callers read. Capability is
// distinct from criticality (McpToolDefinition.criticality, toolRegistry.ts): capability answers
// "can this connection call this tool at all," criticality answers "does calling it right now
// need a fresh or existing approval."
export const allAgentCapabilities: AgentCapability[] = [
  "create_task",
  "query_knowledge_hub",
  "list_projects",
  "create_meeting",
  "create_project",
  "list_stakeholders",
  "create_stakeholder",
  "query_external_model",
];

export type AgentScope = {
  organizationId: string;
  agentConnectionId: string;
  provider: AgentProviderId;
  capabilities: AgentCapability[];
  issuedByUserId?: string;
  issuedByRole?: string;
};

export function agentScopeHasCapability(scope: AgentScope, capability: AgentCapability): boolean {
  return scope.capabilities.includes(capability);
}
