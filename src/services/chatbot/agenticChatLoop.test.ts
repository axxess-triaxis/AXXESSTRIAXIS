import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentScope } from "../../security/agentScope";
import type { TenantScope } from "../../repositories/interfaces";
import type { AiProviderAdapter, AiProviderCompletion } from "../ai/types";

type MockTool = {
  name: string;
  requiredCapability: string;
  criticality: "auto" | "critical";
  description: string;
  inputSchema: { type: "object"; properties: Record<string, { type: string }>; required?: string[] };
  handler: (scope: AgentScope, args: Record<string, unknown>) => Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }>;
};

// vi.mock factories are hoisted above top-level variables, so the mutable tool list must come
// from vi.hoisted rather than a plain top-level const -- same convention as ChatbotPanel.test.tsx.
// A prior version of this file exported a `__state` escape hatch from inside the mock factory and
// imported it back from the real "../agents/toolRegistry" path; CodeQL flagged every access on it
// as "always undefined" because the real module has no such export -- its static analysis doesn't
// evaluate vi.mock substitution. vi.hoisted avoids that entirely: toolState is a real module-scope
// binding, not something imported from a path whose real implementation lacks the property.
const toolState = vi.hoisted(() => ({ tools: [] as MockTool[] }));

vi.mock("../agents/toolRegistry", () => ({
  get agentToolRegistry() {
    return toolState.tools;
  },
  getAgentTool: (name: string) => toolState.tools.find((tool) => tool.name === name),
  validateAgentToolArguments: (tool: MockTool, args: unknown) => {
    if (!args || typeof args !== "object" || Array.isArray(args)) return { ok: false, message: "Tool arguments must be an object." };
    const candidate = args as Record<string, unknown>;
    for (const required of tool.inputSchema.required ?? []) {
      if (candidate[required] === undefined) return { ok: false, message: `${required} is required.` };
    }
    return { ok: true, args: candidate };
  },
}));

const mockRecordAudit = vi.fn();
vi.mock("../agents/agentConnectionRepository", () => ({
  recordAgentToolAuditEvent: (...args: unknown[]) => mockRecordAudit(...args),
}));

const policyState = { blockOpenAi: false, blockDeepSeek: false };
vi.mock("../ai/tenantModelPolicy", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/tenantModelPolicy")>();
  return {
    ...actual,
    buildTenantModelPolicy: (...args: Parameters<typeof actual.buildTenantModelPolicy>) => {
      const policy = actual.buildTenantModelPolicy(...args);
      const blocked = [
        ...(policyState.blockOpenAi ? ["openai" as const] : []),
        ...(policyState.blockDeepSeek ? ["deepseek" as const] : []),
      ];
      if (!blocked.length) return policy;
      return { ...policy, allowedProviders: policy.allowedProviders.filter((name) => !blocked.includes(name)) };
    },
  };
});

import { runAgenticChatTurn } from "./agenticChatLoop";

const tenantScope: TenantScope = { organizationId: "org-1", userId: "user-1" as string, role: "Super Admin" };

function mockAdapter(...responses: Partial<AiProviderCompletion>[]): AiProviderAdapter {
  const complete = vi.fn();
  for (const response of responses) {
    complete.mockResolvedValueOnce({ text: "", confidence: 0.8, ...response } as AiProviderCompletion);
  }
  return { config: { name: "openai", displayName: "OpenAI", configured: true, mode: "remote", status: "configured", capabilities: ["general_chat"], languages: ["english"], costTier: "medium", latencyTier: "low", supportsToolCalling: true }, complete };
}

function mockDeepSeekAdapter(configured: boolean, ...responses: Partial<AiProviderCompletion>[]): AiProviderAdapter {
  const complete = vi.fn();
  for (const response of responses) {
    complete.mockResolvedValueOnce({ text: "", confidence: 0.8, ...response } as AiProviderCompletion);
  }
  return { config: { name: "deepseek", displayName: "DeepSeek V3 (via OpenRouter)", configured, mode: "remote", status: configured ? "configured" : "missing_credentials", capabilities: ["general_chat"], languages: ["english"], costTier: "low", latencyTier: "medium", supportsToolCalling: true }, complete };
}

function makeTool(overrides: Partial<MockTool>): MockTool {
  return {
    name: "list_tasks",
    requiredCapability: "list_tasks",
    criticality: "auto",
    description: "test tool",
    inputSchema: { type: "object", properties: {} },
    handler: async () => ({ content: [{ type: "text", text: "ok" }] }),
    ...overrides,
  };
}

describe("runAgenticChatTurn", () => {
  afterEach(() => {
    toolState.tools = [];
    policyState.blockOpenAi = false;
    policyState.blockDeepSeek = false;
    mockRecordAudit.mockReset();
    vi.clearAllMocks();
  });

  it("returns unavailable without ever calling the model when the prompt classifies as restricted-sensitivity", async () => {
    const adapter = mockAdapter({ text: "should never be reached" });
    const result = await runAgenticChatTurn(
      { tenantScope, role: "Super Admin", userMessage: "Please review this confidential salary record." },
      { openAiAdapter: adapter },
    );

    expect(result.status).toBe("unavailable");
    expect(adapter.complete).not.toHaveBeenCalled();
  });

  it("returns unavailable when the tenant policy does not allow openai", async () => {
    policyState.blockOpenAi = true;
    const adapter = mockAdapter({ text: "should never be reached" });
    const result = await runAgenticChatTurn(
      { tenantScope, role: "Super Admin", userMessage: "List my tasks." },
      { openAiAdapter: adapter },
    );

    expect(result.status).toBe("unavailable");
    expect(adapter.complete).not.toHaveBeenCalled();
  });

  it("never surfaces the raw low-confidence provider diagnostic text (e.g. a 429 failure string) as the reply -- shows the same honest fallback the legacy chatbot path uses", async () => {
    const adapter = mockAdapter({
      text: "OpenAI / ChatGPT request failed (429). This response was not generated by a live model call; treat it as unverified.",
      confidence: 0.3,
    });
    // Not-configured fallback: this test asserts the honest-message substitution itself, not the
    // DeepSeek fallback path (covered separately below), so the fallback must deterministically
    // never fire regardless of the ambient test environment's OPENROUTER_API_KEY.
    const fallback = mockDeepSeekAdapter(false);

    const result = await runAgenticChatTurn(
      { tenantScope, role: "Super Admin", userMessage: "Hello" },
      { openAiAdapter: adapter, openRouterAdapter: fallback },
    );

    expect(result.status).toBe("final");
    if (result.status === "final") {
      expect(result.reply).toBe("AXXESS Copilot's AI provider is temporarily unavailable. Try again shortly.");
      expect(result.reply).not.toContain("429");
      expect(result.reply).not.toContain("not generated by a live model call");
    }
    expect(fallback.complete).not.toHaveBeenCalled();
  });

  it("falls over to DeepSeek when OpenAI comes back as a non-live-call (e.g. a 429), and the DeepSeek answer drives the turn with summed cost", async () => {
    const primary = mockAdapter({
      text: "OpenAI / ChatGPT request failed (429). This response was not generated by a live model call; treat it as unverified.",
      confidence: 0.3,
      actualCostUsd: 0,
    });
    const fallback = mockDeepSeekAdapter(true, { text: "Here's your answer via DeepSeek.", confidence: 0.78, actualCostUsd: 0.0009 });

    const result = await runAgenticChatTurn(
      { tenantScope, role: "Super Admin", userMessage: "Hello" },
      { openAiAdapter: primary, openRouterAdapter: fallback },
    );

    expect(primary.complete).toHaveBeenCalledTimes(1);
    expect(fallback.complete).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("final");
    if (result.status === "final") {
      expect(result.reply).toBe("Here's your answer via DeepSeek.");
      expect(result.costUsd).toBeCloseTo(0.0009, 6);
    }
  });

  it("does not attempt the DeepSeek fallback when it isn't configured -- returns the honest unavailable message from the primary's own failure", async () => {
    const primary = mockAdapter({ text: "OpenAI / ChatGPT request failed (429)...", confidence: 0.3 });
    const fallback = mockDeepSeekAdapter(false, { text: "should never be reached" });

    const result = await runAgenticChatTurn(
      { tenantScope, role: "Super Admin", userMessage: "Hello" },
      { openAiAdapter: primary, openRouterAdapter: fallback },
    );

    expect(fallback.complete).not.toHaveBeenCalled();
    expect(result.status).toBe("final");
    if (result.status === "final") expect(result.reply).toBe("AXXESS Copilot's AI provider is temporarily unavailable. Try again shortly.");
  });

  it("never attempts the DeepSeek fallback when the tenant policy blocks deepseek, even though it's otherwise configured", async () => {
    policyState.blockDeepSeek = true;
    const primary = mockAdapter({ text: "OpenAI / ChatGPT request failed (429)...", confidence: 0.3 });
    const fallback = mockDeepSeekAdapter(true, { text: "should never be reached" });

    const result = await runAgenticChatTurn(
      { tenantScope, role: "Super Admin", userMessage: "Hello" },
      { openAiAdapter: primary, openRouterAdapter: fallback },
    );

    expect(fallback.complete).not.toHaveBeenCalled();
    expect(result.status).toBe("final");
    if (result.status === "final") expect(result.reply).toBe("AXXESS Copilot's AI provider is temporarily unavailable. Try again shortly.");
  });

  it("never touches the DeepSeek fallback adapter when OpenAI's response is a normal, high-confidence answer", async () => {
    const primary = mockAdapter({ text: "Here you go." });
    const fallback = mockDeepSeekAdapter(true, { text: "should never be reached" });

    const result = await runAgenticChatTurn(
      { tenantScope, role: "Super Admin", userMessage: "Hello" },
      { openAiAdapter: primary, openRouterAdapter: fallback },
    );

    expect(fallback.complete).not.toHaveBeenCalled();
    expect(result.status).toBe("final");
    if (result.status === "final") expect(result.reply).toBe("Here you go.");
  });

  it("completes a 2-step auto-tool plan, dispatching each handler with the synthesized scope (not the raw TenantScope)", async () => {
    const listHandler = vi.fn(async () => ({ content: [{ type: "text" as const, text: JSON.stringify([{ id: "t1" }]) }] }));
    const createHandler = vi.fn(async () => ({ content: [{ type: "text" as const, text: JSON.stringify({ id: "t2" }) }] }));
    toolState.tools = [
      makeTool({ name: "list_tasks", requiredCapability: "list_tasks", handler: listHandler }),
      makeTool({ name: "create_task", requiredCapability: "create_task", handler: createHandler }),
    ];

    const adapter = mockAdapter(
      { toolCalls: [{ id: "call_1", name: "list_tasks", arguments: {} }] },
      { toolCalls: [{ id: "call_2", name: "create_task", arguments: { title: "Follow up" } }] },
      { text: "Checked your tasks and created a follow-up." },
    );

    const result = await runAgenticChatTurn(
      { tenantScope, role: "Super Admin", userMessage: "Check my tasks then create a follow-up." },
      { openAiAdapter: adapter },
    );

    expect(result.status).toBe("final");
    if (result.status === "final") {
      expect(result.reply).toBe("Checked your tasks and created a follow-up.");
      expect(result.steps.map((s) => s.toolName)).toEqual(["list_tasks", "create_task"]);
    }
    expect(adapter.complete).toHaveBeenCalledTimes(3);
    expect(listHandler).toHaveBeenCalledTimes(1);
    expect(createHandler).toHaveBeenCalledTimes(1);
    const scopeArg = listHandler.mock.calls[0][0] as AgentScope;
    expect(scopeArg.agentConnectionId).toBe("inapp:user-1");
    expect(scopeArg.provider).toBe("axxess_copilot_inapp");
    expect(scopeArg).not.toHaveProperty("accessToken");
  });

  it("pauses on a critical tool without executing it", async () => {
    const handler = vi.fn(async () => ({ content: [{ type: "text" as const, text: "{}" }] }));
    toolState.tools = [
      makeTool({ name: "create_stakeholder", requiredCapability: "create_stakeholder", criticality: "critical", handler }),
    ];

    const adapter = mockAdapter({ toolCalls: [{ id: "call_1", name: "create_stakeholder", arguments: { name: "Acme Corp" } }] });

    const result = await runAgenticChatTurn(
      { tenantScope, role: "Super Admin", userMessage: "Add Acme Corp as a stakeholder." },
      { openAiAdapter: adapter },
    );

    expect(result.status).toBe("paused");
    if (result.status === "paused") {
      expect(result.pendingTool).toEqual({ id: "call_1", name: "create_stakeholder", arguments: { name: "Acme Corp" } });
      expect(result.summary).toContain("stakeholder");
    }
    expect(handler).not.toHaveBeenCalled();
  });

  it("on confirmed resume, executes exactly the one pending tool then continues the loop", async () => {
    const handler = vi.fn(async () => ({ content: [{ type: "text" as const, text: JSON.stringify({ id: "sh-1" }) }] }));
    toolState.tools = [
      makeTool({ name: "create_stakeholder", requiredCapability: "create_stakeholder", criticality: "critical", handler }),
    ];

    const adapter = mockAdapter({ text: "Added Acme Corp as a stakeholder." });

    const result = await runAgenticChatTurn(
      {
        tenantScope,
        role: "Super Admin",
        userMessage: "Add Acme Corp as a stakeholder.",
        resume: {
          transcript: [{ role: "assistant", content: null, toolCalls: [{ id: "call_1", name: "create_stakeholder", arguments: { name: "Acme Corp" } }] }],
          pendingTool: { id: "call_1", name: "create_stakeholder", arguments: { name: "Acme Corp" } },
          userMessage: "Add Acme Corp as a stakeholder.",
          iterationsUsed: 1,
          confirmed: true,
        },
      },
      { openAiAdapter: adapter },
    );

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("final");
    if (result.status === "final") {
      expect(result.reply).toBe("Added Acme Corp as a stakeholder.");
      expect(result.steps).toEqual([{ toolName: "create_stakeholder", summary: "Added a stakeholder." }]);
    }
    expect(adapter.complete).toHaveBeenCalledTimes(1);
  });

  it("on cancelled resume, stops immediately with zero handler calls and zero model calls", async () => {
    const handler = vi.fn(async () => ({ content: [{ type: "text" as const, text: "{}" }] }));
    toolState.tools = [
      makeTool({ name: "create_stakeholder", requiredCapability: "create_stakeholder", criticality: "critical", handler }),
    ];
    const adapter = mockAdapter({ text: "should never be reached" });

    const result = await runAgenticChatTurn(
      {
        tenantScope,
        role: "Super Admin",
        userMessage: "Add Acme Corp as a stakeholder.",
        resume: {
          transcript: [],
          pendingTool: { id: "call_1", name: "create_stakeholder", arguments: { name: "Acme Corp" } },
          userMessage: "Add Acme Corp as a stakeholder.",
          iterationsUsed: 1,
          confirmed: false,
        },
      },
      { openAiAdapter: adapter },
    );

    expect(result).toEqual({ status: "cancelled" });
    expect(handler).not.toHaveBeenCalled();
    expect(adapter.complete).not.toHaveBeenCalled();
  });

  it("stops at the iteration cap with an honest exhaustion message rather than looping forever", async () => {
    const handler = vi.fn(async () => ({ content: [{ type: "text" as const, text: "{}" }] }));
    toolState.tools = [makeTool({ name: "list_tasks", requiredCapability: "list_tasks", handler })];

    const adapter = mockAdapter(
      { toolCalls: [{ id: "c1", name: "list_tasks", arguments: {} }] },
      { toolCalls: [{ id: "c2", name: "list_tasks", arguments: {} }] },
      { toolCalls: [{ id: "c3", name: "list_tasks", arguments: {} }] },
      { toolCalls: [{ id: "c4", name: "list_tasks", arguments: {} }] },
      { toolCalls: [{ id: "c5", name: "list_tasks", arguments: {} }] },
    );

    const result = await runAgenticChatTurn(
      { tenantScope, role: "Super Admin", userMessage: "Keep checking my tasks." },
      { openAiAdapter: adapter },
    );

    expect(result.status).toBe("final");
    if (result.status === "final") {
      expect(result.reply).toContain("more steps than AXXESS allows");
    }
    expect(adapter.complete).toHaveBeenCalledTimes(5);
    expect(handler).toHaveBeenCalledTimes(5);
  });

  it("feeds a thrown handler error back into the transcript instead of crashing the turn", async () => {
    const handler = vi.fn(async () => { throw new Error("simulated failure"); });
    toolState.tools = [makeTool({ name: "list_tasks", requiredCapability: "list_tasks", handler })];

    const adapter = mockAdapter(
      { toolCalls: [{ id: "c1", name: "list_tasks", arguments: {} }] },
      { text: "I couldn't check your tasks just now." },
    );

    const result = await runAgenticChatTurn(
      { tenantScope, role: "Super Admin", userMessage: "Check my tasks." },
      { openAiAdapter: adapter },
    );

    expect(result.status).toBe("final");
    if (result.status === "final") {
      expect(result.reply).toBe("I couldn't check your tasks just now.");
      expect(result.steps).toEqual([]);
    }
    expect(handler).toHaveBeenCalledTimes(1);
    const secondCallArgs = (adapter.complete as ReturnType<typeof vi.fn>).mock.calls[1][0] as { priorMessages: Array<{ role: string; content: string }> };
    expect(secondCallArgs.priorMessages.some((m) => m.role === "tool" && m.content.includes("simulated failure"))).toBe(true);
  });

  it("feeds an isError tool result back into the transcript without recording it as a completed step", async () => {
    const handler = vi.fn(async () => ({ content: [{ type: "text" as const, text: "Task not found." }], isError: true }));
    toolState.tools = [makeTool({ name: "list_tasks", requiredCapability: "list_tasks", handler })];

    const adapter = mockAdapter(
      { toolCalls: [{ id: "c1", name: "list_tasks", arguments: {} }] },
      { text: "That task could not be found." },
    );

    const result = await runAgenticChatTurn(
      { tenantScope, role: "Super Admin", userMessage: "Check my tasks." },
      { openAiAdapter: adapter },
    );

    expect(result.status).toBe("final");
    if (result.status === "final") expect(result.steps).toEqual([]);
    expect(mockRecordAudit).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toolName: "list_tasks", success: false }));
  });
});
