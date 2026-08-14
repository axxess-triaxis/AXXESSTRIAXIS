import { describe, expect, it } from "vitest";
import { allAgentCapabilities } from "../../security/agentScope";
import { agentPolicyTemplates, getAgentPolicyTemplate, isAgentPolicyTemplateId } from "./agentPolicyTemplates";

// MCP3-2 (2026-08-14): these templates are the only "policy applies correct tools" surface this
// sprint adds -- every assertion here is against the real allAgentCapabilities list, not a copy of
// it, so a future tool rename/removal in toolRegistry.ts/agentScope.ts fails this test instead of
// silently leaving a template pointing at a capability that no longer exists.
describe("agentPolicyTemplates", () => {
  it("defines exactly the 5 required templates", () => {
    expect(agentPolicyTemplates.map((template) => template.id).sort()).toEqual([
      "crm_assistant",
      "governance_reviewer",
      "project_coordinator",
      "read_only_analyst",
      "workflow_assistant",
    ]);
  });

  it("every template capability is a real, known agent capability", () => {
    for (const template of agentPolicyTemplates) {
      for (const capability of template.capabilities) {
        expect(allAgentCapabilities).toContain(capability);
      }
    }
  });

  it("no template is empty", () => {
    for (const template of agentPolicyTemplates) {
      expect(template.capabilities.length).toBeGreaterThan(0);
    }
  });

  it("read_only_analyst grants only read/list/query tools, no create/update capabilities", () => {
    const template = getAgentPolicyTemplate("read_only_analyst");
    expect(template?.capabilities.every((capability) => /^(list_|query_|get_|search_)/.test(capability))).toBe(true);
  });

  it("getAgentPolicyTemplate resolves a known id and returns undefined for an unknown one", () => {
    expect(getAgentPolicyTemplate("crm_assistant")?.label).toBe("CRM assistant");
    expect(getAgentPolicyTemplate("not_a_real_template")).toBeUndefined();
  });

  it("isAgentPolicyTemplateId narrows correctly", () => {
    expect(isAgentPolicyTemplateId("workflow_assistant")).toBe(true);
    expect(isAgentPolicyTemplateId("not_a_real_template")).toBe(false);
    expect(isAgentPolicyTemplateId(42)).toBe(false);
  });
});
