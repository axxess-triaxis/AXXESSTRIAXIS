// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TenantScope } from "../../repositories/interfaces";
import type { AiProviderAdapter, AiProviderCompletion } from "../ai/types";

const toolState = vi.hoisted(() => ({ tools: [] as Array<Record<string, unknown> & { name: string }> }));

vi.mock("../agents/toolRegistry", () => ({
  get agentToolRegistry() {
    return toolState.tools;
  },
  getAgentTool: (name: string) => toolState.tools.find((tool) => tool.name === name),
  validateAgentToolArguments: (_tool: unknown, args: Record<string, unknown>) => ({ ok: true, args }),
}));
vi.mock("../agents/agentConnectionRepository", () => ({ recordAgentToolAuditEvent: vi.fn() }));

import { clearAiTracer } from "../ai/tracing/aiTracing";
import { runsFrom, startRecordedTracing } from "../ai/tracing/langsmithTestRecorder";
import { runAgenticChatTurn } from "./agenticChatLoop";

const tenantScope: TenantScope = {
  organizationId: "11111111-aaaa-4000-8000-000000000001",
  userId: "22222222-bbbb-4000-8000-000000000002",
  role: "Super Admin",
  accessToken: "access-token-value",
};

function adapter(...responses: Partial<AiProviderCompletion>[]): AiProviderAdapter {
  const complete = vi.fn();
  for (const response of responses) complete.mockResolvedValueOnce({ text: "", confidence: 0.8, ...response });
  return {
    config: { name: "openai", displayName: "OpenAI", configured: true, mode: "remote", status: "configured", capabilities: ["general_chat"], languages: ["english"], costTier: "medium", latencyTier: "low", supportsToolCalling: true },
    complete,
  };
}

function tool(name: string, criticality: "auto" | "critical", text: string) {
  return { name, requiredCapability: name, criticality, description: "test tool", inputSchema: { type: "object", properties: {} }, handler: async () => ({ content: [{ type: "text", text }] }) };
}

const callTool = (name: string, args: Record<string, unknown> = {}): Partial<AiProviderCompletion> => ({ toolCalls: [{ id: "call-1", name, arguments: args }], model: "gpt-4o-mini", usage: { promptTokens: 3, completionTokens: 2 } });

describe("Copilot turn tracing", () => {
  beforeEach(() => clearAiTracer());
  afterEach(() => {
    clearAiTracer();
    toolState.tools = [];
  });

  it("records the turn, each model call and the tool call as one trace, without IDs or tokens", async () => {
    toolState.tools = [tool("list_tasks", "auto", "2 tasks, owner a.person@example.com")];
    const { sent, tracing } = startRecordedTracing();
    const result = await runAgenticChatTurn(
      { tenantScope, role: "Super Admin", userMessage: "List my tasks." },
      { openAiAdapter: adapter(callTool("list_tasks", { limit: 2 }), { text: "You have 2 tasks." }), env: {} as NodeJS.ProcessEnv },
    );
    await tracing!.flush();

    expect(result).toMatchObject({ status: "final", reply: "You have 2 tasks." });
    const runs = runsFrom(sent);
    const root = runs.find((run) => run.name === "axxess-copilot-turn")!;
    expect(runs.map((run) => run.name).sort()).toEqual(["axxess-copilot-turn", "axxess-model:openai", "axxess-model:openai", "axxess-tool:list_tasks"]);
    expect(runs.filter((run) => run !== root).every((run) => run.parent_run_id === root.id && run.trace_id === root.trace_id)).toBe(true);
    expect(root.inputs).toMatchObject({ message: "List my tasks." });
    expect(root.outputs).toMatchObject({ status: "final", reply: "You have 2 tasks.", toolsUsed: ["list_tasks"] });
    expect(runs.find((run) => run.run_type === "tool")!.inputs).toEqual({ arguments: { limit: 2 } });
    expect(new Set(runs.map((run) => run.extra.metadata.thread_id)).size).toBe(1);

    const wire = JSON.stringify(sent);
    for (const leaked of [tenantScope.organizationId, tenantScope.userId, tenantScope.accessToken!, "a.person@example.com"]) expect(wire).not.toContain(leaked);
  });

  it("sends nothing from a tool result that holds a restricted record, nor from later steps", async () => {
    toolState.tools = [tool("list_documents", "auto", JSON.stringify([{ title: "Zebra merger", classification: "restricted" }]))];
    const { sent, tracing } = startRecordedTracing();
    await runAgenticChatTurn(
      { tenantScope, role: "Super Admin", userMessage: "List my files." },
      { openAiAdapter: adapter(callTool("list_documents"), { text: "You have the Zebra merger." }), env: {} as NodeJS.ProcessEnv },
    );
    await tracing!.flush();
    expect(runsFrom(sent)).toHaveLength(4);
    expect(JSON.stringify(sent)).not.toMatch(/zebra/i);
  });

  it("puts a paused turn and its confirmation in the same thread", async () => {
    toolState.tools = [tool("create_meeting", "critical", "Created.")];
    const { sent, tracing } = startRecordedTracing();
    const userMessage = "Set up a call.";
    const paused = await runAgenticChatTurn(
      { tenantScope, role: "Super Admin", userMessage },
      { openAiAdapter: adapter(callTool("create_meeting")), env: {} as NodeJS.ProcessEnv },
    );
    if (paused.status !== "paused") throw new Error(`expected paused, got ${paused.status}`);
    await runAgenticChatTurn(
      { tenantScope, role: "Super Admin", userMessage, resume: { ...paused, confirmed: true } },
      { openAiAdapter: adapter({ text: "Done." }), env: {} as NodeJS.ProcessEnv },
    );
    await tracing!.flush();

    const turns = runsFrom(sent).filter((run) => run.name === "axxess-copilot-turn");
    expect(turns).toHaveLength(2);
    expect(new Set(turns.map((run) => run.extra.metadata.thread_id)).size).toBe(1);
    expect(runsFrom(sent).filter((run) => run.name === "axxess-tool:create_meeting")).toHaveLength(1);
  });

  it("records nothing for a cancelled confirmation or a restricted prompt", async () => {
    const { sent, tracing } = startRecordedTracing();
    const model = adapter();
    const cancelled = await runAgenticChatTurn(
      { tenantScope, role: "Super Admin", userMessage: "x", resume: { transcript: [], pendingTool: { id: "1", name: "create_meeting", arguments: {} }, userMessage: "x", iterationsUsed: 1, confirmed: false } },
      { openAiAdapter: model, env: {} as NodeJS.ProcessEnv },
    );
    const restricted = await runAgenticChatTurn(
      { tenantScope, role: "Super Admin", userMessage: "Review this confidential salary record." },
      { openAiAdapter: model, env: {} as NodeJS.ProcessEnv },
    );
    await tracing!.flush();
    expect([cancelled.status, restricted.status]).toEqual(["cancelled", "unavailable"]);
    expect(sent).toEqual([]);
  });
});
