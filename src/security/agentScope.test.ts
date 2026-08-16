import { describe, expect, it } from "vitest";
import { agentProviderIds, agentScopeHasCapability, allAgentCapabilities, defaultAgentCapabilities, mcp2AgentCapabilities, type AgentScope } from "./agentScope";

describe("agentScope", () => {
  it("lists exactly the 3 providers the founder scoped for Phase 1 (OpenAI, Anthropic, Microsoft Copilot), plus the Sprint 1 in-app chatbot's own synthesized provider id", () => {
    expect(agentProviderIds).toEqual(["openai", "anthropic", "microsoft_copilot", "axxess_copilot_inapp"]);
  });

  it("lists exactly the 3 tools Phase 1 ships as capabilities", () => {
    expect(allAgentCapabilities).toEqual(expect.arrayContaining(["create_task", "query_knowledge_hub", "list_projects"]));
  });

  it("MCP2 lists new capabilities separately from the default connection surface", () => {
    expect(allAgentCapabilities).toEqual([
      "create_task",
      "query_knowledge_hub",
      "list_projects",
      "create_meeting",
      "create_project",
      "list_stakeholders",
      "create_stakeholder",
      "query_external_model",
      "list_tasks",
      "list_meetings",
      "list_documents",
      "get_dashboard_snapshot",
      "update_task_status",
      "add_stakeholder_note",
      "search_audit_logs",
    ]);
    expect(defaultAgentCapabilities).not.toEqual(allAgentCapabilities);
    expect(defaultAgentCapabilities).toEqual([
      "create_task",
      "query_knowledge_hub",
      "list_projects",
      "create_meeting",
      "create_project",
      "list_stakeholders",
      "create_stakeholder",
      "query_external_model",
    ]);
    expect(mcp2AgentCapabilities).toEqual([
      "list_tasks",
      "list_meetings",
      "list_documents",
      "get_dashboard_snapshot",
      "update_task_status",
      "add_stakeholder_note",
      "search_audit_logs",
    ]);
  });

  it("reports capability membership without mutating the scope", () => {
    const scope: AgentScope = {
      organizationId: "org-1",
      agentConnectionId: "conn-1",
      provider: "openai",
      capabilities: ["list_projects"],
    };

    expect(agentScopeHasCapability(scope, "list_projects")).toBe(true);
    expect(agentScopeHasCapability(scope, "create_task")).toBe(false);
  });
});
