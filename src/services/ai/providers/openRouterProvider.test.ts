import { afterEach, describe, expect, it, vi } from "vitest";
import type { AiPromptRequest } from "../types";

const mockCheckBudget = vi.fn();
const mockRecordSpend = vi.fn();
vi.mock("../aiSpendGuard", () => ({
  checkProviderBudgetHeadroom: (...args: unknown[]) => mockCheckBudget(...args),
  recordProviderSpend: (...args: unknown[]) => mockRecordSpend(...args),
}));

import { createOpenRouterProvider } from "./openRouterProvider";

const kimiConfig = {
  name: "kimi" as const,
  displayName: "Kimi K2 (Moonshot AI, via OpenRouter)",
  configured: true,
  mode: "remote" as const,
  status: "configured" as const,
  capabilities: ["general_chat" as const],
  languages: ["english"],
  costTier: "low" as const,
  latencyTier: "medium" as const,
};

const baseRequest: AiPromptRequest = {
  prompt: "Summarize this month's referral backlog.",
  context: { organizationId: "org-1", userId: "user-1", userRole: "Manager" },
};

const classification = {
  category: "general_chat" as const,
  sensitivity: "internal" as const,
  language: "english",
  requiredReasoning: "low" as const,
  requiresCitation: false,
  costPreference: "low" as const,
  latencyPreference: "balanced" as const,
  humanReviewRequired: false,
  confidence: 0.8,
  signals: [],
};

describe("createOpenRouterProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    mockCheckBudget.mockReset();
    mockRecordSpend.mockReset();
  });

  it("returns a low-confidence, clearly-labeled result without calling fetch when no API key is set", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const provider = createOpenRouterProvider(kimiConfig, {} as NodeJS.ProcessEnv);

    const result = await provider.complete(baseRequest, classification);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockCheckBudget).not.toHaveBeenCalled();
    expect(result.confidence).toBeLessThan(0.62);
    expect(result.text).toContain("not fully configured");
  });

  it("checks budget headroom (shared 'openrouter' account, not per-model) before calling, and calls OpenRouter's chat completions endpoint with real cost from token usage", async () => {
    mockCheckBudget.mockResolvedValue({ ok: true, remainingUsd: 19.5 });
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
      const body = JSON.parse(init?.body as string) as { model: string; messages: unknown[] };
      expect(body.model).toBe("moonshotai/kimi-k2");
      return new Response(JSON.stringify({
        choices: [{ message: { content: "Referral backlog is down 12% week over week." } }],
        usage: { prompt_tokens: 1000, completion_tokens: 500 },
      }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createOpenRouterProvider(kimiConfig, { OPENROUTER_API_KEY: "test-key" } as NodeJS.ProcessEnv);
    const result = await provider.complete(baseRequest, classification);

    expect(mockCheckBudget).toHaveBeenCalledWith("openrouter");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.text).toBe("Referral backlog is down 12% week over week.");
    expect(result.confidence).toBeGreaterThanOrEqual(0.62);
    expect(result.usage).toEqual({ promptTokens: 1000, completionTokens: 500 });
    // 1000 * 0.00000057 + 500 * 0.0000023 = 0.00057 + 0.00115 = 0.00172
    expect(result.actualCostUsd).toBeCloseTo(0.00172, 5);
    expect(mockRecordSpend).toHaveBeenCalledWith("openrouter", 0.00172);
  });

  it("refuses to call fetch at all when the budget guard reports no headroom -- fails closed, never overspends", async () => {
    mockCheckBudget.mockResolvedValue({ ok: false, reason: "Budget safety margin reached for openrouter: $19.60 of $20.00 spent, $0.40 remaining (safety margin: $0.50)." });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const provider = createOpenRouterProvider(kimiConfig, { OPENROUTER_API_KEY: "test-key" } as NodeJS.ProcessEnv);
    const result = await provider.complete(baseRequest, classification);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.text).toContain("call skipped");
    expect(result.text).toContain("Budget safety margin reached");
    expect(result.confidence).toBeLessThan(0.62);
  });

  it("returns a low-confidence, non-throwing result on a non-OK response", async () => {
    mockCheckBudget.mockResolvedValue({ ok: true, remainingUsd: 19.5 });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("rate limited", { status: 429 })));
    const provider = createOpenRouterProvider(kimiConfig, { OPENROUTER_API_KEY: "test-key" } as NodeJS.ProcessEnv);

    const result = await provider.complete(baseRequest, classification);

    expect(result.confidence).toBeLessThan(0.62);
    expect(result.text).toContain("429");
    expect(result.text).toContain("not generated by a live model call");
    expect(mockRecordSpend).not.toHaveBeenCalled();
  });

  it("returns a low-confidence, non-throwing result when fetch itself throws", async () => {
    mockCheckBudget.mockResolvedValue({ ok: true, remainingUsd: 19.5 });
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network unreachable"); }));
    const provider = createOpenRouterProvider(kimiConfig, { OPENROUTER_API_KEY: "test-key" } as NodeJS.ProcessEnv);

    const result = await provider.complete(baseRequest, classification);

    expect(result.confidence).toBeLessThan(0.62);
    expect(result.text).toContain("network unreachable");
  });

  it("returns a low-confidence result when the response has no content", async () => {
    mockCheckBudget.mockResolvedValue({ ok: true, remainingUsd: 19.5 });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ choices: [] }), { status: 200 })));
    const provider = createOpenRouterProvider(kimiConfig, { OPENROUTER_API_KEY: "test-key" } as NodeJS.ProcessEnv);

    const result = await provider.complete(baseRequest, classification);

    expect(result.confidence).toBeLessThan(0.62);
    expect(result.text).toContain("returned no content");
    expect(mockRecordSpend).not.toHaveBeenCalled();
  });
});
