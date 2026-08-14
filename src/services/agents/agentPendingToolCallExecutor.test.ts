import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentScope } from "../../security/agentScope";
import type { PendingToolCallSummary } from "./agentPendingToolCallRepository";

const state = {
  tools: [] as Array<{
    name: string;
    inputSchema: { type: "object"; properties: Record<string, { type: string }>; required?: string[] };
    handler: (scope: AgentScope, args: Record<string, unknown>) => Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }>;
  }>,
};

vi.mock("./toolRegistry", () => ({
  getAgentTool: (name: string) => state.tools.find((tool) => tool.name === name),
  validateAgentToolArguments: (tool: { inputSchema: { required?: string[]; properties: Record<string, unknown> } }, args: unknown) => {
    if (!args || typeof args !== "object") return { ok: false, message: "Tool arguments must be an object." };
    const candidate = args as Record<string, unknown>;
    for (const required of tool.inputSchema.required ?? []) {
      if (!candidate[required]) return { ok: false, message: `${required} is required.` };
    }
    return { ok: true, args: candidate };
  },
}));

import { executePendingToolCall } from "./agentPendingToolCallExecutor";

const scope: AgentScope = { organizationId: "org-1", agentConnectionId: "conn-1", provider: "openai", capabilities: ["create_meeting"] };

function pendingCall(overrides: Partial<PendingToolCallSummary> = {}): PendingToolCallSummary {
  return {
    id: "pending-1",
    organizationId: "org-1",
    agentConnectionId: "conn-1",
    approvalRequestId: "approval-1",
    toolName: "create_meeting",
    toolVersion: "1",
    provider: "openai",
    arguments: { title: "Kickoff" },
    idempotencyKey: "idem-1",
    status: "pending",
    createdAt: "2026-08-14T00:00:00.000Z",
    ...overrides,
  };
}

describe("executePendingToolCall", () => {
  afterEach(() => {
    state.tools = [];
    vi.clearAllMocks();
  });

  it("runs the tool handler and returns its result on success", async () => {
    state.tools = [{
      name: "create_meeting",
      inputSchema: { type: "object", properties: { title: { type: "string" } }, required: ["title"] },
      handler: async () => ({ content: [{ type: "text", text: JSON.stringify({ id: "meeting-1" }) }] }),
    }];

    const outcome = await executePendingToolCall(pendingCall(), scope);
    expect(outcome.status).toBe("executed");
    if (outcome.status === "executed") {
      expect(JSON.parse((outcome.result as { content: Array<{ text: string }> }).content[0].text)).toEqual({ id: "meeting-1" });
    }
  });

  it("returns failed when the tool no longer exists in the registry", async () => {
    state.tools = [];
    const outcome = await executePendingToolCall(pendingCall(), scope);
    expect(outcome).toEqual({ status: "failed", error: "Unknown tool: create_meeting" });
  });

  it("re-validates stored arguments and fails if they no longer satisfy the tool's schema", async () => {
    state.tools = [{
      name: "create_meeting",
      inputSchema: { type: "object", properties: { title: { type: "string" } }, required: ["title"] },
      handler: async () => ({ content: [{ type: "text", text: "{}" }] }),
    }];

    const outcome = await executePendingToolCall(pendingCall({ arguments: {} }), scope);
    expect(outcome).toEqual({ status: "failed", error: "title is required." });
  });

  it("returns failed when the handler itself reports an error result", async () => {
    state.tools = [{
      name: "create_meeting",
      inputSchema: { type: "object", properties: { title: { type: "string" } }, required: ["title"] },
      handler: async () => ({ content: [{ type: "text", text: "boom" }], isError: true }),
    }];

    const outcome = await executePendingToolCall(pendingCall(), scope);
    expect(outcome).toEqual({ status: "failed", error: "boom" });
  });

  it("returns failed when the handler throws", async () => {
    state.tools = [{
      name: "create_meeting",
      inputSchema: { type: "object", properties: { title: { type: "string" } }, required: ["title"] },
      handler: async () => { throw new Error("simulated failure"); },
    }];

    const outcome = await executePendingToolCall(pendingCall(), scope);
    expect(outcome).toEqual({ status: "failed", error: "simulated failure" });
  });
});
