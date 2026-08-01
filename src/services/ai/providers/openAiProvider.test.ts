import { afterEach, describe, expect, it, vi } from "vitest";
import type { AiPromptRequest } from "../types";

const mockCheckBudget = vi.fn();
const mockRecordSpend = vi.fn();
vi.mock("../aiSpendGuard", () => ({
  checkProviderBudgetHeadroom: (...args: unknown[]) => mockCheckBudget(...args),
  recordProviderSpend: (...args: unknown[]) => mockRecordSpend(...args),
}));

import { createOpenAiProvider } from "./openAiProvider";

const openAiConfig = {
  name: "openai" as const,
  displayName: "OpenAI / ChatGPT",
  configured: true,
  mode: "remote" as const,
  status: "configured" as const,
  capabilities: ["general_chat" as const, "rag_answer" as const],
  languages: ["english"],
  costTier: "medium" as const,
  latencyTier: "low" as const,
};

const baseRequest: AiPromptRequest = {
  prompt: "What is AXXESS TRIaxis?",
  context: { organizationId: "org-1", userId: "user-1", userRole: "Manager" },
};

const classification = {
  category: "rag_answer" as const,
  sensitivity: "internal" as const,
  language: "english",
  requiredReasoning: "low" as const,
  requiresCitation: true,
  costPreference: "balanced" as const,
  latencyPreference: "balanced" as const,
  humanReviewRequired: false,
  confidence: 0.8,
  signals: [],
};

describe("createOpenAiProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    mockCheckBudget.mockReset();
    mockRecordSpend.mockReset();
  });

  it("returns a low-confidence, clearly-labeled result without calling fetch or the budget guard when no API key is set", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const provider = createOpenAiProvider(openAiConfig, {} as NodeJS.ProcessEnv);

    const result = await provider.complete(baseRequest, classification);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockCheckBudget).not.toHaveBeenCalled();
    expect(result.confidence).toBeLessThan(0.62);
    expect(result.text).toContain("not fully configured");
  });

  it("checks the 'openai' budget before calling, then calls OpenAI's real Chat Completions endpoint and computes real cost from token usage", async () => {
    mockCheckBudget.mockResolvedValue({ ok: true, remainingUsd: 19.5 });
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe("https://api.openai.com/v1/chat/completions");
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
      const body = JSON.parse(init?.body as string) as { model: string; messages: unknown[] };
      expect(body.model).toBe("gpt-4o-mini");
      expect(body.messages).toEqual([{ role: "user", content: baseRequest.prompt }]);
      return new Response(JSON.stringify({
        choices: [{ message: { content: "AXXESS TRIaxis is an AI-governed institutional operating platform." } }],
        usage: { prompt_tokens: 800, completion_tokens: 200 },
      }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createOpenAiProvider(openAiConfig, { OPENAI_API_KEY: "test-key" } as NodeJS.ProcessEnv);
    const result = await provider.complete(baseRequest, classification);

    expect(mockCheckBudget).toHaveBeenCalledWith("openai");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.text).toBe("AXXESS TRIaxis is an AI-governed institutional operating platform.");
    expect(result.confidence).toBeGreaterThanOrEqual(0.62);
    expect(result.usage).toEqual({ promptTokens: 800, completionTokens: 200 });
    // 800 * 0.00000015 + 200 * 0.0000006 = 0.00012 + 0.00012 = 0.00024
    expect(result.actualCostUsd).toBeCloseTo(0.00024, 6);
    expect(mockRecordSpend).toHaveBeenCalledWith("openai", 0.00024);
  });

  it("refuses to call fetch at all when the budget guard reports no headroom -- fails closed, never overspends the founder's OpenAI account", async () => {
    mockCheckBudget.mockResolvedValue({ ok: false, reason: "Budget safety margin reached for openai: $19.60 of $20.00 spent, $0.40 remaining (safety margin: $0.50)." });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const provider = createOpenAiProvider(openAiConfig, { OPENAI_API_KEY: "test-key" } as NodeJS.ProcessEnv);
    const result = await provider.complete(baseRequest, classification);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.text).toContain("call skipped");
    expect(result.text).toContain("Budget safety margin reached");
    expect(result.confidence).toBeLessThan(0.62);
  });

  it("returns a low-confidence, non-throwing result on a non-OK response", async () => {
    mockCheckBudget.mockResolvedValue({ ok: true, remainingUsd: 19.5 });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("rate limited", { status: 429 })));
    const provider = createOpenAiProvider(openAiConfig, { OPENAI_API_KEY: "test-key" } as NodeJS.ProcessEnv);

    const result = await provider.complete(baseRequest, classification);

    expect(result.confidence).toBeLessThan(0.62);
    expect(result.text).toContain("429");
    expect(result.text).toContain("not generated by a live model call");
    expect(mockRecordSpend).not.toHaveBeenCalled();
  });

  it("returns a low-confidence, non-throwing result when fetch itself throws", async () => {
    mockCheckBudget.mockResolvedValue({ ok: true, remainingUsd: 19.5 });
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network unreachable"); }));
    const provider = createOpenAiProvider(openAiConfig, { OPENAI_API_KEY: "test-key" } as NodeJS.ProcessEnv);

    const result = await provider.complete(baseRequest, classification);

    expect(result.confidence).toBeLessThan(0.62);
    expect(result.text).toContain("network unreachable");
  });

  it("returns a low-confidence result when the response has no content, and does not record spend", async () => {
    mockCheckBudget.mockResolvedValue({ ok: true, remainingUsd: 19.5 });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ choices: [] }), { status: 200 })));
    const provider = createOpenAiProvider(openAiConfig, { OPENAI_API_KEY: "test-key" } as NodeJS.ProcessEnv);

    const result = await provider.complete(baseRequest, classification);

    expect(result.confidence).toBeLessThan(0.62);
    expect(result.text).toContain("returned no content");
    expect(mockRecordSpend).not.toHaveBeenCalled();
  });
});
