import { NextResponse } from "next/server";
import { resolveAgentScopeFromApiKey, recordAgentToolAuditEvent } from "../../../../services/agents/agentConnectionRepository";
import { agentScopeHasCapability } from "../../../../security/agentScope";
import { agentToolRegistry, getAgentTool } from "../../../../services/agents/toolRegistry";

// Agentic Infrastructure Phase 1 (2026-07-30): a real MCP (Model Context Protocol) server over the
// Streamable HTTP transport -- a single POST endpoint speaking JSON-RPC 2.0 -- per the founder's
// explicit choice, so Claude/OpenAI-family MCP clients can connect directly with no bespoke
// translation layer. Implements the three core methods a tool-calling MCP server needs:
// initialize, tools/list, tools/call. Auth is a transport-level HTTP concern (Bearer API key),
// checked before any JSON-RPC parsing -- consistent with how MCP's HTTP transport treats auth.

const serverInfo = { name: "axxess-triaxis-agent-server", version: "1.0.0" };
const protocolVersion = "2025-06-18";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
};

function rpcResult(id: string | number | null, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

function rpcError(id: string | number | null, code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } });
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const rawKey = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
  if (!rawKey) {
    return NextResponse.json({ error: "Missing Bearer API key." }, { status: 401 });
  }

  const scope = await resolveAgentScopeFromApiKey(rawKey);
  if (!scope) {
    return NextResponse.json({ error: "Invalid or revoked agent API key." }, { status: 401 });
  }

  const body = await request.json().catch(() => undefined) as JsonRpcRequest | undefined;
  if (!body || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
    return rpcError(body?.id ?? null, -32600, "Invalid JSON-RPC 2.0 request.");
  }

  if (body.method === "initialize") {
    return rpcResult(body.id, {
      protocolVersion,
      capabilities: { tools: {} },
      serverInfo,
    });
  }

  if (body.method === "tools/list") {
    return rpcResult(body.id, {
      tools: agentToolRegistry
        .filter((tool) => agentScopeHasCapability(scope, tool.requiredCapability))
        .map((tool) => ({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema })),
    });
  }

  if (body.method === "tools/call") {
    const toolName = typeof body.params?.name === "string" ? body.params.name : "";
    const toolArgs = (body.params?.arguments ?? {}) as Record<string, unknown>;
    const tool = getAgentTool(toolName);

    if (!tool) return rpcError(body.id, -32601, `Unknown tool: ${toolName}`);
    if (!agentScopeHasCapability(scope, tool.requiredCapability)) {
      await recordAgentToolAuditEvent(scope, { toolName, success: false, errorMessage: "capability not granted" });
      return rpcError(body.id, -32001, `This agent connection does not have the ${tool.requiredCapability} capability.`);
    }

    try {
      const result = await tool.handler(scope, toolArgs);
      await recordAgentToolAuditEvent(scope, { toolName, success: !result.isError, argsSummary: toolArgs, errorMessage: result.isError ? result.content[0]?.text : undefined });
      return rpcResult(body.id, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown tool execution error.";
      await recordAgentToolAuditEvent(scope, { toolName, success: false, argsSummary: toolArgs, errorMessage: message });
      return rpcError(body.id, -32603, message);
    }
  }

  return rpcError(body.id, -32601, `Unknown method: ${body.method}`);
}
