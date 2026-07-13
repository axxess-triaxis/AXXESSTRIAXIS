import { describe, expect, it } from "vitest";
import { getAiRouterStatusSnapshot, routeAiRequest } from "./router/aiRouter";

describe("AI router", () => {
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
  });

  it("reports configured provider health", () => {
    const snapshot = getAiRouterStatusSnapshot({ OPENAI_API_KEY: "configured" } as unknown as NodeJS.ProcessEnv);
    expect(snapshot.configuredCount).toBeGreaterThanOrEqual(1);
    expect(snapshot.providers.some((provider) => provider.name === "openai" && provider.configured)).toBe(true);
  });
});
