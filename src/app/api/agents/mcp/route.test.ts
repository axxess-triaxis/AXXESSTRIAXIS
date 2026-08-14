import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentScope } from "../../../../security/agentScope";

const state = {
  scope: null as AgentScope | null,
  auditEvents: [] as Array<{ scope: AgentScope; input: Record<string, unknown> }>,
  granted: false,
  approvalCreateCalls: [] as Array<Record<string, unknown>>,
  pendingToolCallCreateCalls: [] as Array<Record<string, unknown>>,
};

vi.mock("../../../../services/agents/agentConnectionRepository", () => ({
  resolveAgentScopeFromApiKey: async () => state.scope,
  recordAgentToolAuditEvent: async (scope: AgentScope, input: Record<string, unknown>) => {
    state.auditEvents.push({ scope, input });
  },
}));

vi.mock("../../../../services/agents/agentGrantsRepository", () => ({
  hasGrant: async () => state.granted,
}));

vi.mock("../../../../repositories/workflowActionRepositories", () => ({
  approvalRequestsRepository: {
    create: async (_scope: unknown, input: Record<string, unknown>) => {
      state.approvalCreateCalls.push(input);
      return { id: "approval-1", ...input };
    },
  },
}));

// MCP3-2: the pending-execution counterpart to the approval_requests row above -- created in the
// same critical-tool-no-grant branch, this is what PATCH /api/approvals/[id] later reserves and
// executes exactly once.
vi.mock("../../../../services/agents/agentPendingToolCallRepository", () => ({
  createPendingToolCall: async (input: Record<string, unknown>) => {
    state.pendingToolCallCreateCalls.push(input);
    return { id: "pending-call-1", ...input, status: "pending" };
  },
}));

vi.mock("../../../../services/agents/toolRegistry", () => {
  const tools = [
    {
      name: "create_task",
      version: "1",
      description: "Create a task.",
      requiredCapability: "create_task",
      criticality: "auto",
      inputSchema: { type: "object", properties: { title: { type: "string" } }, required: ["title"] },
      handler: async (_scope: AgentScope, args: Record<string, unknown>) => {
        if (!args.title) return { content: [{ type: "text", text: "title is required." }], isError: true };
        if (args.title === "boom") throw new Error("simulated tool failure");
        return { content: [{ type: "text", text: JSON.stringify({ id: "task-1" }) }] };
      },
    },
    {
      name: "create_meeting",
      version: "1",
      description: "Create a meeting.",
      requiredCapability: "create_meeting",
      criticality: "critical",
      inputSchema: { type: "object", properties: { title: { type: "string" } }, required: ["title"] },
      handler: async () => ({ content: [{ type: "text", text: JSON.stringify({ id: "meeting-1" }) }] }),
    },
  ];
  return {
    agentToolRegistry: tools,
    getAgentTool: (name: string) => tools.find((tool) => tool.name === name),
    validateAgentToolArguments: (tool: { inputSchema: { required?: string[]; properties: Record<string, unknown> } }, args: unknown) => {
      if (!args || typeof args !== "object" || Array.isArray(args)) return { ok: false, message: "Tool arguments must be an object." };
      const candidate = args as Record<string, unknown>;
      for (const required of tool.inputSchema.required ?? []) {
        if (!candidate[required]) return { ok: false, message: `${required} is required.` };
      }
      for (const key of Object.keys(candidate)) {
        if (!tool.inputSchema.properties[key]) return { ok: false, message: `Unsupported argument: ${key}.` };
      }
      return { ok: true, args: candidate };
    },
  };
});

import { POST } from "./route";

function rpcRequest(body: Record<string, unknown>, apiKey = "axa_live_valid") {
  return new Request("https://example.com/api/agents/mcp", {
    method: "POST",
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    body: JSON.stringify(body),
  });
}

const activeScope: AgentScope = {
  organizationId: "org-1",
  agentConnectionId: "conn-1",
  provider: "anthropic",
  capabilities: ["create_task", "create_meeting"],
  issuedByUserId: "user-1",
  issuedByRole: "Organization Admin",
};

describe("POST /api/agents/mcp (MCP JSON-RPC server)", () => {
  afterEach(() => {
    state.scope = null;
    state.auditEvents = [];
    state.granted = false;
    state.approvalCreateCalls = [];
    state.pendingToolCallCreateCalls = [];
    vi.clearAllMocks();
  });

  it("returns 401 with no Bearer key at all -- auth is a transport concern, not a JSON-RPC error", async () => {
    const response = await POST(new Request("https://example.com/api/agents/mcp", { method: "POST", body: "{}" }));
    expect(response.status).toBe(401);
  });

  it("returns 401 for a key that doesn't resolve to any active connection", async () => {
    state.scope = null;
    const response = await POST(rpcRequest({ jsonrpc: "2.0", id: 1, method: "initialize" }));
    expect(response.status).toBe(401);
  });

  it("handles initialize with server capabilities", async () => {
    state.scope = activeScope;
    const response = await POST(rpcRequest({ jsonrpc: "2.0", id: 1, method: "initialize" }));
    const body = await response.json() as { result: { protocolVersion: string; serverInfo: { name: string } } };
    expect(body.result.serverInfo.name).toBeTruthy();
    expect(body.result.protocolVersion).toBeTruthy();
  });

  it("tools/list returns only tools the connection's capabilities grant", async () => {
    state.scope = { ...activeScope, capabilities: [] };
    const response = await POST(rpcRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" }));
    const body = await response.json() as { result: { tools: unknown[] } };
    expect(body.result.tools).toHaveLength(0);
  });

  it("tools/list returns granted tools with their schema", async () => {
    state.scope = activeScope;
    const response = await POST(rpcRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" }));
    const body = await response.json() as { result: { tools: Array<{ name: string; inputSchema: unknown }> } };
    expect(body.result.tools.map((tool) => tool.name).sort()).toEqual(["create_meeting", "create_task"]);
    expect(body.result.tools[0].inputSchema).toBeTruthy();
  });

  it("tools/call rejects an unknown tool with a JSON-RPC method-not-found style error", async () => {
    state.scope = activeScope;
    const response = await POST(rpcRequest({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "delete_everything", arguments: {} } }));
    const body = await response.json() as { error: { code: number } };
    expect(body.error.code).toBe(-32601);
  });

  it("tools/call rejects a tool the connection lacks capability for, and still audit-logs the denial", async () => {
    state.scope = { ...activeScope, capabilities: [] };
    const response = await POST(rpcRequest({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "create_task", arguments: { title: "x" } } }));
    const body = await response.json() as { error: { message: string } };
    expect(body.error.message).toContain("create_task");
    expect(state.auditEvents).toHaveLength(1);
    expect(state.auditEvents[0].input.success).toBe(false);
  });

  it("tools/call rejects malformed arguments before handler execution or approval creation", async () => {
    state.scope = activeScope;
    const response = await POST(rpcRequest({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "create_meeting", arguments: { tenantId: "org-2" } } }));
    const body = await response.json() as { error: { code: number; message: string } };

    expect(body.error.code).toBe(-32602);
    expect(body.error.message).toContain("title is required");
    expect(state.approvalCreateCalls).toHaveLength(0);
    expect(state.auditEvents[0].input.success).toBe(false);
  });

  it("rejects oversized MCP payloads before parsing", async () => {
    state.scope = activeScope;
    const response = await POST(new Request("https://example.com/api/agents/mcp", {
      method: "POST",
      headers: { Authorization: "Bearer axa_live_valid", "content-length": String(65 * 1024) },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }),
    }));

    expect(response.status).toBe(413);
  });

  it("tools/call executes a real tool and audit-logs success", async () => {
    state.scope = activeScope;
    const response = await POST(rpcRequest({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "create_task", arguments: { title: "Follow up" } } }));
    const body = await response.json() as { result: { content: Array<{ text: string }> } };
    expect(JSON.parse(body.result.content[0].text)).toEqual({ id: "task-1" });
    expect(state.auditEvents).toHaveLength(1);
    expect(state.auditEvents[0].input.success).toBe(true);
  });

  it("tools/call catches a thrown handler error as a JSON-RPC internal error and still audit-logs the failure", async () => {
    state.scope = activeScope;
    const response = await POST(rpcRequest({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "create_task", arguments: { title: "boom" } } }));
    const body = await response.json() as { error: { code: number; message: string } };
    expect(body.error.code).toBe(-32603);
    expect(body.error.message).toContain("simulated tool failure");
    expect(state.auditEvents[0].input.success).toBe(false);
  });

  it("rejects malformed JSON-RPC (missing jsonrpc/method)", async () => {
    state.scope = activeScope;
    const response = await POST(rpcRequest({ id: 1 }));
    const body = await response.json() as { error: { code: number } };
    expect(body.error.code).toBe(-32600);
  });

  it("Agentic Infrastructure Phase 2 (2026-07-30): a critical tool with no grant does NOT execute -- it creates a real approval and returns pending", async () => {
    state.scope = activeScope;
    state.granted = false;
    const response = await POST(rpcRequest({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "create_meeting", arguments: { title: "Kickoff" } } }));
    const body = await response.json() as { result: { content: Array<{ text: string }> } };
    const payload = JSON.parse(body.result.content[0].text) as { status: string; approvalRequestId: string };

    expect(payload.status).toBe("pending_approval");
    expect(payload.approvalRequestId).toBe("approval-1");
    expect(state.approvalCreateCalls).toHaveLength(1);
    expect(state.approvalCreateCalls[0].metadata).toMatchObject({ agentConnectionId: "conn-1", toolName: "create_meeting" });
    expect(state.auditEvents[0].input.success).toBe(false);
    expect(state.auditEvents[0].input.errorMessage).toBe("pending_approval");
  });

  // MCP3-2 (2026-08-14): "approval resume" needs a real machine-execution record to reserve and
  // run when a human later approves -- this proves the MCP route creates it in the same request
  // that creates the approval_requests row, carrying the tool name/version/arguments/connection it
  // will need to actually execute the call later, with an idempotency key and pending status.
  it("MCP3-2: a critical tool with no grant also persists a pending tool call linked to the approval", async () => {
    state.scope = activeScope;
    state.granted = false;
    const response = await POST(rpcRequest({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "create_meeting", arguments: { title: "Kickoff" } } }));
    const body = await response.json() as { result: { content: Array<{ text: string }> } };
    const payload = JSON.parse(body.result.content[0].text) as { pendingToolCallId: string };

    expect(payload.pendingToolCallId).toBe("pending-call-1");
    expect(state.pendingToolCallCreateCalls).toHaveLength(1);
    expect(state.pendingToolCallCreateCalls[0]).toMatchObject({
      organizationId: "org-1",
      agentConnectionId: "conn-1",
      approvalRequestId: "approval-1",
      toolName: "create_meeting",
      toolVersion: "1",
      provider: "anthropic",
      arguments: { title: "Kickoff" },
    });
    expect(typeof state.pendingToolCallCreateCalls[0].idempotencyKey).toBe("string");
    expect((state.pendingToolCallCreateCalls[0].idempotencyKey as string).length).toBeGreaterThan(0);
  });

  it("MCP3-2: tools/list includes each tool's version", async () => {
    state.scope = activeScope;
    const response = await POST(rpcRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" }));
    const body = await response.json() as { result: { tools: Array<{ name: string; version: string }> } };
    expect(body.result.tools.every((tool) => tool.version === "1")).toBe(true);
  });

  it("a critical tool WITH an active grant executes immediately, same as an auto tool", async () => {
    state.scope = activeScope;
    state.granted = true;
    const response = await POST(rpcRequest({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "create_meeting", arguments: { title: "Kickoff" } } }));
    const body = await response.json() as { result: { content: Array<{ text: string }> } };

    expect(JSON.parse(body.result.content[0].text)).toEqual({ id: "meeting-1" });
    expect(state.approvalCreateCalls).toHaveLength(0);
    expect(state.auditEvents[0].input.success).toBe(true);
  });

  it("an auto tool (create_task) never checks for a grant, even when none exists", async () => {
    state.scope = activeScope;
    state.granted = false;
    const response = await POST(rpcRequest({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "create_task", arguments: { title: "Follow up" } } }));
    const body = await response.json() as { result: { content: Array<{ text: string }> } };

    expect(JSON.parse(body.result.content[0].text)).toEqual({ id: "task-1" });
    expect(state.approvalCreateCalls).toHaveLength(0);
  });
});
