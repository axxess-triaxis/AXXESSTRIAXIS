import { describe, expect, it } from "vitest";
import { classifyAiPrompt } from "./prompt-classifier";
import { getAiProviderConfigurations } from "./model-routing-policy";
import { buildTenantModelPolicy, selectTenantModelRoute } from "./tenantModelPolicy";

const context = {
  organizationId: "org-north-east-health-mission",
  userId: "user-mission-director",
  userRole: "Executive",
};

describe("tenant model policy", () => {
  it("routes consequential reviews to human approval", () => {
    const request = {
      prompt: "Review this district procurement risk and compliance exposure.",
      task: "compliance_review" as const,
      context,
    };
    const classification = classifyAiPrompt(request);
    const decision = selectTenantModelRoute(
      request.prompt,
      classification,
      context,
      getAiProviderConfigurations({ ANTHROPIC_API_KEY: "configured", AXXESS_AI_ROUTING_MODE: "demo" } as unknown as NodeJS.ProcessEnv),
    );

    expect(decision.provider.name).toBe("anthropic");
    expect(decision.requiresHumanApproval).toBe(true);
    expect(decision.gatewayTags).toContain("task:compliance_review");
  });

  it("keeps restricted data on the local fallback unless policy allows external providers", () => {
    const request = {
      prompt: "Summarize restricted patient referral data with citations.",
      task: "rag_answer" as const,
      context: { ...context, sensitivity: "restricted" as const },
    };
    const classification = classifyAiPrompt(request);
    const decision = selectTenantModelRoute(
      request.prompt,
      classification,
      request.context,
      getAiProviderConfigurations({ OPENAI_API_KEY: "configured", AXXESS_AI_ROUTING_MODE: "demo" } as unknown as NodeJS.ProcessEnv),
    );

    expect(decision.provider.name).toBe("local");
    expect(decision.approvalReason).toContain("Restricted institutional data");
  });

  it("merges tenant overrides without losing baseline fallback protection", () => {
    const policy = buildTenantModelPolicy("org-1", {
      allowedProviders: ["google", "local"],
      fallbackProviders: ["google"],
      gatewayTags: ["env:staging"],
    });

    expect(policy.allowedProviders).toEqual(["google", "local"]);
    expect(policy.fallbackProviders).toEqual(["google"]);
    expect(policy.gatewayTags).toEqual(["env:staging"]);
  });
});
