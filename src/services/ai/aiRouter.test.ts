import { afterEach, describe, expect, it, vi } from "vitest";
import { getAiRouterStatusSnapshot, routeAiRequest } from "./router/aiRouter";

describe("AI router", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("routes a real request end to end through a live-configured non-local provider (Sprint 1 proof)", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      choices: [{ message: { content: "The referral backlog dropped 12% this week." } }],
      usage: { prompt_tokens: 1000, completion_tokens: 500 },
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await routeAiRequest({
      prompt: "Summarize the referral backlog trend.",
      task: "general_chat",
      context: {
        organizationId: "org-nehm",
        userId: "user-director",
        userRole: "Executive",
        preferredProvider: "kimi",
      },
    }, { OPENROUTER_API_KEY: "test-key", AXXESS_AI_ROUTING_MODE: "demo" } as unknown as NodeJS.ProcessEnv);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.providerUsed).toBe("kimi");
    expect(result.answer).toBe("The referral backlog dropped 12% this week.");
    expect(result.humanReviewRequired).toBe(false);
    // Real cost from token usage, not the pre-call heuristic estimate.
    expect(result.estimatedCostUsd).toBeCloseTo(0.00172, 5);
  });

  it("uses local fallback without remote provider keys", async () => {
    const result = await routeAiRequest({
      prompt: "Summarize the Cachar maternal referral risk register with citations.",
      task: "rag_answer",
      context: {
        organizationId: "org-nehm",
        userId: "user-director",
        userRole: "Executive",
        requiresCitation: true,
      },
    }, { AXXESS_AI_ROUTING_MODE: "demo" } as unknown as NodeJS.ProcessEnv);

    expect(result.providerUsed).toBe("local");
    expect(result.answer).toContain("deterministic local provider");
    expect(result.routingReason).toContain("local fallback");
    expect(result.fallbackChain).toContain("local");
    expect(result.policyId).toBe("tenant-default-ai-routing-policy");
  });

  it("reports configured provider health", () => {
    const snapshot = getAiRouterStatusSnapshot({ OPENAI_API_KEY: "configured" } as unknown as NodeJS.ProcessEnv);
    expect(snapshot.configuredCount).toBeGreaterThanOrEqual(1);
    expect(snapshot.providers.some((provider) => provider.name === "openai" && provider.configured)).toBe(true);
  });
});
