import { describe, expect, it } from "vitest";
import { agentProviderIds, agentScopeHasCapability, allAgentCapabilities, type AgentScope } from "./agentScope";

describe("agentScope", () => {
  it("lists exactly the 3 providers the founder scoped for Phase 1 (OpenAI, Anthropic, Microsoft Copilot)", () => {
    expect(agentProviderIds).toEqual(["openai", "anthropic", "microsoft_copilot"]);
  });

  it("lists exactly the 3 tools Phase 1 ships as capabilities", () => {
    expect(allAgentCapabilities).toEqual(["create_task", "query_knowledge_hub", "list_projects"]);
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
