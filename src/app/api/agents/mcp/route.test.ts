import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentScope } from "../../../../security/agentScope";

const state = {
  scope: null as AgentScope | null,
  auditEvents: [] as Array<{ scope: AgentScope; input: Record<string, unknown> }>,
};

vi.mock("../../../../services/agents/agentConnectionRepository", () => ({
  resolveAgentScopeFromApiKey: async () => state.scope,
  recordAgentToolAuditEvent: async (scope: AgentScope, input: Record<string, unknown>) => {
    state.auditEvents.push({ scope, input });
  },
}));

vi.mock("../../../../services/agents/toolRegistry", () => {
  const tools = [
    {
      name: "create_task",
      description: "Create a task.",
      requiredCapability: "create_task",
      inputSchema: { type: "object", properties: { title: { type: "string" } }, required: ["title"] },
      handler: async (_scope: AgentScope, args: Record<string, unknown>) => {
        if (!args.title) return { content: [{ type: "text", text: "title is required." }], isError: true };
        if (args.title === "boom") throw new Error("simulated tool failure");
        return { content: [{ type: "text", text: JSON.stringify({ id: "task-1" }) }] };
      },
    },
  ];
  return {
    agentToolRegistry: tools,
    getAgentTool: (name: string) => tools.find((tool) => tool.name === name),
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
  capabilities: ["create_task"],
  issuedByUserId: "user-1",
  issuedByRole: "Organization Admin",
};

describe("POST /api/agents/mcp (MCP JSON-RPC server)", () => {
  afterEach(() => {
    state.scope = null;
    state.auditEvents = [];
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
    expect(body.result.tools.map((tool) => tool.name)).toEqual(["create_task"]);
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
});
