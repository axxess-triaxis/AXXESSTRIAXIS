import { expect, test } from "@playwright/test";
import { loginAs, seededUsers, skipUnlessSeeded } from "./helpers";
import { knowledgeDocuments } from "./fixtures/knowledgeDocuments";
import { createAgentConnection, ensureKnowledgeDocuments, mcp, mcpText, revokeAgentConnection } from "./knowledgeSeed";

// Live end-to-end checks of the AI layer on a seeded deployment (staging), founder request
// 2026-11-16: "test AI workspace, agentic workflows, MCP server and RAG end-to-end". Every call
// goes to the real deployment: real ingest, real retrieval, real model providers, real audit rows.

const [riskRegister, governancePolicy] = knowledgeDocuments;
// /api/rag/query returns its cited passages as `sources` (RagAnswer in governedRag.ts).
type RagAnswer = { answer?: string; sources?: Array<{ title?: string; excerpt?: string }>; retrievalMode?: string; error?: string };

test.describe("AI stack live: RAG, MCP, agentic chat, AI workspace", () => {
  test.describe.configure({ timeout: 120_000 });
  test.beforeEach(() => {
    skipUnlessSeeded();
  });

  test("seeds the Knowledge Hub test documents through the real ingest pipeline", async ({ page }) => {
    await loginAs(page, seededUsers.orgAdminAlpha);
    const result = await ensureKnowledgeDocuments(page.request);
    test.info().annotations.push({ type: "seed", description: JSON.stringify(result) });
  });

  test("RAG answers from the seeded documents with citations", async ({ page }) => {
    await loginAs(page, seededUsers.orgAdminAlpha);
    await ensureKnowledgeDocuments(page.request);
    const response = await page.request.post("/api/rag/query", { data: { question: riskRegister.question, limit: 5 }, timeout: 60_000 });
    const body = await response.json() as RagAnswer;
    await test.info().attach("rag-response.json", { body: JSON.stringify(body, null, 2), contentType: "application/json" });
    console.log(`RAG retrievalMode=${String(body.retrievalMode)} citations=${JSON.stringify((body.sources ?? []).map((c) => c.title))}`);
    expect(response.ok(), JSON.stringify(body)).toBe(true);
    const titles = (body.sources ?? []).map((citation) => citation.title);
    expect(titles, `retrievalMode=${String(body.retrievalMode)} answer=${String(body.answer).slice(0, 300)}`).toContain(riskRegister.title);
    const cited = (body.sources ?? []).map((citation) => citation.excerpt ?? "").join(" ");
    expect(`${body.answer ?? ""} ${cited}`).toMatch(riskRegister.fact);
  });

  test("RAG never cites a restricted document to a guest", async ({ page }) => {
    await loginAs(page, seededUsers.guestAlpha);
    const response = await page.request.post("/api/rag/query", { data: { question: governancePolicy.question, limit: 5 }, timeout: 60_000 });
    if (!response.ok()) {
      expect([401, 403]).toContain(response.status());
      return;
    }
    const body = await response.json() as RagAnswer;
    expect((body.sources ?? []).map((citation) => citation.title)).not.toContain(governancePolicy.title);
    expect(body.answer ?? "").not.toMatch(governancePolicy.fact);
  });

  test("MCP server: auth, initialize, tools/list, a read tool, and a critical tool held for approval", async ({ page }) => {
    await loginAs(page, seededUsers.orgAdminAlpha);
    const request = page.request;

    const noKey = await request.post("/api/agents/mcp", { data: { jsonrpc: "2.0", id: 1, method: "initialize" } });
    expect(noKey.status()).toBe(401);
    expect((await mcp(request, "axk_not_a_real_key", "initialize")).status).toBe(401);

    const connection = await createAgentConnection(request, "e2e live MCP");
    try {
      const init = await mcp(request, connection.rawApiKey, "initialize");
      expect(init.body.result?.serverInfo?.name).toBe("axxess-triaxis-agent-server");

      const listed = await mcp(request, connection.rawApiKey, "tools/list");
      const toolNames = (listed.body.result?.tools ?? []).map((tool: { name: string }) => tool.name);
      expect(toolNames).toEqual(expect.arrayContaining(["query_knowledge_hub", "create_project"]));
      expect(toolNames).not.toContain("search_audit_logs");

      const asked = await mcp(request, connection.rawApiKey, "tools/call", { name: "query_knowledge_hub", arguments: { question: riskRegister.question } });
      expect(asked.body.error, JSON.stringify(asked.body.error)).toBeUndefined();
      console.log(`MCP query_knowledge_hub: ${mcpText(asked.body).slice(0, 400)}`);
      // Whether the governed answer cites the document is checked by the RAG test; here the tool must answer.
      expect(mcpText(asked.body).length).toBeGreaterThan(0);

      const denied = await mcp(request, connection.rawApiKey, "tools/call", { name: "search_audit_logs", arguments: {} });
      expect(denied.body.error?.code).toBe(-32001);

      const held = await mcp(request, connection.rawApiKey, "tools/call", { name: "create_project", arguments: { name: "E2E MCP held project (reject me)" } });
      expect(held.body.error, JSON.stringify(held.body.error)).toBeUndefined();
      const pending = JSON.parse(mcpText(held.body)) as { status?: string; approvalRequestId?: string };
      expect(pending.status).toBe("pending_approval");
      expect(pending.approvalRequestId).toBeTruthy();

      // The human in the loop says no: the held call must never execute.
      const rejected = await request.patch(`/api/approvals/${pending.approvalRequestId}`, {
        data: { status: "rejected", decisionReason: "E2E live test: agent calls are rejected after the check." },
      });
      expect(rejected.ok(), await rejected.text()).toBe(true);
    } finally {
      await revokeAgentConnection(request, connection.id);
    }
    expect((await mcp(request, connection.rawApiKey, "initialize")).status).toBe(401);
  });

  test("agentic chat runs a read-only tool loop with a real model", async ({ page }) => {
    await loginAs(page, seededUsers.orgAdminAlpha);
    const response = await page.request.post("/api/ai/agentic-chat", { data: { userMessage: "List my open tasks. Only read, do not change anything." }, timeout: 60_000 });
    const body = await response.json() as { status?: string; reason?: string; reply?: string; steps?: Array<{ toolName: string }> };
    expect(response.ok(), JSON.stringify(body)).toBe(true);
    // agentic_unavailable means no tool-calling provider is configured on this deployment: a real
    // finding, reported as a failure rather than skipped.
    expect(body.status, body.reason ?? JSON.stringify(body)).not.toBe("agentic_unavailable");
    expect(["final", "paused"]).toContain(body.status);
    test.info().annotations.push({ type: "agentic", description: JSON.stringify({ status: body.status, tools: body.steps?.map((step) => step.toolName) }) });
    if (body.status === "final") expect((body.reply ?? "").length).toBeGreaterThan(0);
  });

  test("AI workspace asks a governed question in the UI and shows a cited answer", async ({ page }) => {
    await loginAs(page, seededUsers.orgAdminAlpha);
    await page.getByRole("button", { name: /AI Workspace/i }).first().click();
    await page.getByPlaceholder(/Ask AXXESS about portfolios/i).fill(riskRegister.question);
    const answered = page.waitForResponse((response) => response.url().includes("/api/rag/query"), { timeout: 60_000 });
    await page.getByRole("button", { name: "Send governed question" }).click();
    const answer = await answered;
    expect(answer.ok()).toBe(true);
    const body = await answer.json() as RagAnswer;
    // The UI must show what the API returned: the cited title when there is one, else the answer text.
    const expected = body.sources?.[0]?.title ?? (body.answer ?? "").slice(0, 40);
    await expect(page.getByText(expected, { exact: false }).first()).toBeVisible({ timeout: 20_000 });
  });
});
