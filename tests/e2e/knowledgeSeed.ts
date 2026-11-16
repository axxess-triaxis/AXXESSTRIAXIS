import { expect, type APIRequestContext } from "@playwright/test";
import { E2E_KNOWLEDGE_TAG, knowledgeDocuments } from "./fixtures/knowledgeDocuments";

// Helpers that drive the live API with the signed-in page's cookies (page.request). Used against
// staging only (E2E_RUN_SEEDED=true); never against production.

export type AgentConnection = { id: string; rawApiKey: string };

export async function createAgentConnection(request: APIRequestContext, label: string, extraCapabilities: string[] = []): Promise<AgentConnection> {
  const created = await request.post("/api/agents/connections", { data: { provider: "anthropic", label } });
  expect(created.status(), await created.text()).toBe(201);
  const { connection, rawApiKey } = await created.json() as { connection: { id: string; capabilities: string[] }; rawApiKey: string };
  if (extraCapabilities.length) {
    const patched = await request.patch("/api/agents/connections", {
      data: { id: connection.id, capabilities: [...new Set([...connection.capabilities, ...extraCapabilities])] },
    });
    expect(patched.ok(), await patched.text()).toBe(true);
  }
  return { id: connection.id, rawApiKey };
}

export async function revokeAgentConnection(request: APIRequestContext, id: string) {
  await request.delete(`/api/agents/connections?id=${encodeURIComponent(id)}`).catch(() => undefined);
}

let rpcId = 0;
export async function mcp(request: APIRequestContext, apiKey: string, method: string, params?: Record<string, unknown>) {
  const response = await request.post("/api/agents/mcp", {
    headers: { Authorization: `Bearer ${apiKey}` },
    data: { jsonrpc: "2.0", id: ++rpcId, method, params },
  });
  return { status: response.status(), body: await response.json().catch(() => ({})) as McpBody };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON-RPC result shapes differ per method; tests assert on them.
export type McpBody = { result?: any; error?: { code?: number; message?: string } };

export function mcpText(body: McpBody) {
  return String(body.result?.content?.[0]?.text ?? "");
}

// Ingests any fixture document that org Alpha does not have yet, so reruns add nothing. Lists
// through the MCP list_documents tool with a short-lived connection, because documents are
// otherwise read from the browser's Supabase client, not from an API route.
export async function ensureKnowledgeDocuments(request: APIRequestContext) {
  const connection = await createAgentConnection(request, "e2e knowledge seed", ["list_documents"]);
  try {
    const listed = await mcp(request, connection.rawApiKey, "tools/call", { name: "list_documents", arguments: { tag: E2E_KNOWLEDGE_TAG, limit: 100 } });
    expect(listed.body.error, JSON.stringify(listed.body.error)).toBeUndefined();
    const existing = new Set((JSON.parse(mcpText(listed.body) || "[]") as Array<{ title?: string; status?: string }>)
      .filter((document) => document.status !== "deleted")
      .map((document) => document.title));
    const ingested: string[] = [];
    for (const fixture of knowledgeDocuments) {
      if (existing.has(fixture.title)) continue;
      const response = await request.post("/api/documents/ingest", {
        timeout: 60_000,
        data: {
          title: fixture.title,
          bodyText: fixture.bodyText,
          fileName: fixture.fileName,
          mimeType: "text/markdown",
          visibility: "organization",
          classification: fixture.classification,
          tags: [E2E_KNOWLEDGE_TAG],
          extractionMethod: "plain",
        },
      });
      expect(response.ok(), `ingest ${fixture.title}: ${await response.text()}`).toBe(true);
      ingested.push(fixture.title);
    }
    return { ingested, alreadyPresent: [...existing] };
  } finally {
    await revokeAgentConnection(request, connection.id);
  }
}
