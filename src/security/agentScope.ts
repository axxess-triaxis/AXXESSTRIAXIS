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
  | "query_external_model"
  // MCP2 (2026-08-14):
  | "list_tasks"
  | "list_meetings"
  | "list_documents"
  | "get_dashboard_snapshot"
  | "update_task_status"
  | "add_stakeholder_note"
  | "search_audit_logs";

// Capability is distinct from criticality (McpToolDefinition.criticality, toolRegistry.ts):
// capability answers "can this connection call this tool at all," criticality answers "does
// calling it right now need a fresh or existing approval." MCP2 tools remain opt-in so older
// keys do not silently gain a broader surface when the registry grows.
export const mcp1AgentCapabilities: AgentCapability[] = [
  "create_task",
  "query_knowledge_hub",
  "list_projects",
  "create_meeting",
  "create_project",
  "list_stakeholders",
  "create_stakeholder",
  "query_external_model",
];

export const mcp2AgentCapabilities: AgentCapability[] = [
  "list_tasks",
  "list_meetings",
  "list_documents",
  "get_dashboard_snapshot",
  "update_task_status",
  "add_stakeholder_note",
  "search_audit_logs",
];

export const allAgentCapabilities: AgentCapability[] = [
  ...mcp1AgentCapabilities,
  ...mcp2AgentCapabilities,
];

// New connections default to the already-reviewed MCP1 surface. MCP2 tools are deliberately
// opt-in through the connection capability list so old or newly-created keys do not silently gain
// a broader surface just because the registry grows.
export const defaultAgentCapabilities: AgentCapability[] = [...mcp1AgentCapabilities];

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

export function isAgentCapability(value: unknown): value is AgentCapability {
  return typeof value === "string" && allAgentCapabilities.includes(value as AgentCapability);
}

export function normalizeAgentCapabilities(values: unknown): AgentCapability[] {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.filter(isAgentCapability)));
}
