import { beforeEach, describe, expect, it, vi } from "vitest";

// Ops worker support (2026-11-25): the MCP route end to end with the real tool registry, key
// resolution and repositories. Only the Supabase REST call is replaced, by a small in-memory store
// that applies eq filters and the agent_pending_tool_calls UNIQUE (idempotency_key) constraint.
type Row = Record<string, unknown>;

const { db } = vi.hoisted(() => ({
  db: {
    tables: {} as Record<string, Array<Record<string, unknown>>>,
    nextId: 1,
    // When set, the first N inserts into approval_requests wait for each other, so N calls race.
    raceOf: 0,
    waiting: [] as Array<() => void>,
    failApprovalClose: false,
  },
}));

vi.mock("../../../../repositories/supabaseAdmin", () => {
  const matches = (row: Record<string, unknown>, query?: URLSearchParams) =>
    [...(query ?? new URLSearchParams()).entries()].every(([column, filter]) =>
      !filter.startsWith("eq.") || String(row[column]) === filter.slice(3));

  return {
    isSupabaseAdminConfigured: () => true,
    supabaseAdminRest: async (table: string, options: { method?: string; query?: URLSearchParams; body?: Record<string, unknown>; prefer?: string } = {}) => {
      const rows = (db.tables[table] ??= []);
      const method = options.method ?? "GET";
      if (method === "GET") return rows.filter((row) => matches(row, options.query)).map((row) => structuredClone(row));
      if (method === "POST") {
        const body = options.body ?? {};
        if (table === "approval_requests" && db.raceOf > 0) {
          await new Promise<void>((resolve) => {
            db.waiting.push(resolve);
            if (db.waiting.length === db.raceOf) {
              db.raceOf = 0;
              for (const release of db.waiting.splice(0)) release();
            }
          });
        }
        if (table === "agent_pending_tool_calls" && rows.some((row) => row.idempotency_key === body.idempotency_key)) {
          if (options.prefer?.includes("resolution=ignore-duplicates") && options.query?.get("on_conflict") === "idempotency_key") return [];
          throw new Error(`Supabase admin request failed for ${table}: 409 {"code":"23505"}`);
        }
        const id = `00000000-0000-4000-8000-${String(db.nextId++).padStart(12, "0")}`;
        // jsonb does not keep key order: reverse it, so comparing arguments as text would fail.
        const args = body.arguments ? { arguments: Object.fromEntries(Object.entries(body.arguments as object).reverse()) } : {};
        const row = { id, status: "pending", created_at: "2026-11-25T10:00:00.000Z", ...structuredClone(body), ...args };
        rows.push(row);
        return [structuredClone(row)];
      }
      if (method === "PATCH") {
        if (table === "approval_requests" && db.failApprovalClose) throw new Error("close failed");
        const changed = rows.filter((row) => matches(row, options.query));
        for (const row of changed) Object.assign(row, options.body);
        return changed.map((row) => structuredClone(row));
      }
      return [];
    },
  };
});

import { POST } from "./route";
import { hashAgentApiKey } from "../../../../services/agents/agentConnectionVault";
import { allAgentCapabilities, defaultAgentCapabilities } from "../../../../security/agentScope";
import { getAgentTool } from "../../../../services/agents/toolRegistry";

process.env.AXXESS_TOKEN_VAULT_KEY = "test-token-vault-key-with-at-least-32-characters";

const CONN_A = "aaaaaaaa-0000-4000-8000-000000000001";
const CONN_B = "bbbbbbbb-0000-4000-8000-000000000002";
const CONN_OTHER_ORG = "cccccccc-0000-4000-8000-000000000003";
const KEY_A = "axa_live_a";
const KEY_B = "axa_live_b";
const KEY_OTHER_ORG = "axa_live_c";
const META_KEY = "com.triaxisventures/idempotencyKey";

function connection(id: string, apiKey: string, organizationId: string): Row {
  return {
    id,
    organization_id: organizationId,
    provider: "anthropic",
    label: "ops worker",
    api_key_hash: hashAgentApiKey(apiKey),
    api_key_prefix: "axa_live_",
    capabilities: ["create_task", "create_project", "create_meeting", "list_projects", "get_pending_tool_call"],
    status: "active",
    issued_by_user_id: "user-1",
    issued_by_role: "Organization Admin",
    created_at: "2026-11-25T09:00:00.000Z",
  };
}

function send(body: Row, apiKey = KEY_A) {
  return POST(new Request("https://example.com/api/agents/mcp", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  }));
}

type Reply = { result?: { content: Array<{ text: string }>; isError?: boolean; _meta?: Row }; error?: { code: number; message: string } };

async function call(name: string, args: Row, options: { key?: unknown; apiKey?: string } = {}): Promise<Reply> {
  const meta = "key" in options ? { _meta: { [META_KEY]: options.key } } : {};
  const response = await send({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args, ...meta } }, options.apiKey);
  return await response.json() as Reply;
}

function payload(reply: Reply) {
  return JSON.parse(reply.result?.content[0]?.text ?? "null") as Row;
}

const pendingRows = () => db.tables.agent_pending_tool_calls ?? [];
const approvals = () => db.tables.approval_requests ?? [];
const audits = () => (db.tables.audit_logs ?? []).map((row) => row.metadata as Row);

beforeEach(() => {
  db.tables = {
    agent_connections: [
      connection(CONN_A, KEY_A, "org-1"),
      connection(CONN_B, KEY_B, "org-1"),
      connection(CONN_OTHER_ORG, KEY_OTHER_ORG, "org-2"),
    ],
  };
  db.nextId = 1;
  db.raceOf = 0;
  db.waiting = [];
  db.failApprovalClose = false;
});

describe("tools/call with a caller idempotency key", () => {
  it("stores the key as <agentConnectionId>:<key>", async () => {
    const reply = await call("create_project", { name: "Solar" }, { key: "run-7:step-2" });

    expect(payload(reply).status).toBe("pending_approval");
    expect(pendingRows().map((row) => row.idempotency_key)).toEqual([`${CONN_A}:run-7:step-2`]);
  });

  it("a duplicate retry returns the existing pending call and creates nothing", async () => {
    const first = payload(await call("create_project", { name: "Solar", description: "Phase 1" }, { key: "run-7:step-2" }));
    const retry = payload(await call("create_project", { name: "Solar", description: "Phase 1" }, { key: "run-7:step-2" }));

    expect(retry).toEqual({ ...first, duplicate: true });
    expect(pendingRows()).toHaveLength(1);
    expect(approvals()).toHaveLength(1);
  });

  it("the same key with changed arguments is refused and creates nothing", async () => {
    await call("create_project", { name: "Solar" }, { key: "run-7:step-2" });
    const reply = await call("create_project", { name: "Wind" }, { key: "run-7:step-2" });

    expect(reply.error?.code).toBe(-32009);
    expect(pendingRows()).toHaveLength(1);
    expect(approvals()).toHaveLength(1);
    expect(audits().at(-1)).toMatchObject({ success: false, errorMessage: expect.stringContaining("idempotency key") });
  });

  it("the same key with a different tool is refused, even for a tool that needs no approval", async () => {
    await call("create_project", { name: "Solar" }, { key: "run-7:step-2" });
    const critical = await call("create_meeting", { title: "Solar", startsAt: "2026-12-01T10:00:00Z" }, { key: "run-7:step-2" });
    const auto = await call("create_task", { title: "Solar" }, { key: "run-7:step-2" });

    expect(critical.error?.code).toBe(-32009);
    expect(auto.error?.code).toBe(-32009);
    expect(approvals()).toHaveLength(1);
    expect(db.tables.tasks ?? []).toHaveLength(0);
  });

  it("two racing calls leave one pending call and one open approval; the losing approval is closed with no reviewer", async () => {
    db.raceOf = 2;
    const replies = await Promise.all([
      call("create_project", { name: "Solar" }, { key: "race-0001" }),
      call("create_project", { name: "Solar" }, { key: "race-0001" }),
    ]);

    expect(pendingRows()).toHaveLength(1);
    expect(replies.map((reply) => payload(reply).pendingToolCallId)).toEqual([pendingRows()[0].id, pendingRows()[0].id]);
    expect(approvals()).toHaveLength(2);
    expect(approvals().filter((row) => row.status === "pending").map((row) => row.id)).toEqual([pendingRows()[0].approval_request_id]);
    const closed = approvals().find((row) => row.status !== "pending");
    expect(closed).toMatchObject({ status: "rejected", decision_reason: expect.stringContaining("Closed automatically") });
    expect(closed?.reviewer_user_id ?? null).toBeNull();
  });

  it("two racing calls with different arguments: one is refused and its approval is closed", async () => {
    db.raceOf = 2;
    const replies = await Promise.all([
      call("create_project", { name: "Solar" }, { key: "race-0002" }),
      call("create_project", { name: "Wind" }, { key: "race-0002" }),
    ]);

    expect(replies.filter((reply) => reply.error?.code === -32009)).toHaveLength(1);
    expect(pendingRows()).toHaveLength(1);
    expect(approvals().filter((row) => row.status === "pending")).toHaveLength(1);
  });

  it("the losing call still gets the existing row when closing its approval fails, and the failure is audited", async () => {
    db.raceOf = 2;
    db.failApprovalClose = true;
    const replies = await Promise.all([
      call("create_project", { name: "Solar" }, { key: "race-0003" }),
      call("create_project", { name: "Solar" }, { key: "race-0003" }),
    ]);

    expect(new Set(replies.map((reply) => payload(reply).pendingToolCallId)).size).toBe(1);
    expect(audits().some((row) => String(row.errorMessage).includes("could not be closed"))).toBe(true);
  });

  it("two connections may use the same key without seeing each other's call", async () => {
    const a = payload(await call("create_project", { name: "Solar" }, { key: "run-7:step-2" }));
    const b = payload(await call("create_project", { name: "Solar" }, { key: "run-7:step-2", apiKey: KEY_B }));

    expect(b.duplicate).toBeUndefined();
    expect(b.pendingToolCallId).not.toBe(a.pendingToolCallId);
    expect(approvals()).toHaveLength(2);
  });

  it("a retry after approval does not run the tool again through a new Always Allow grant", async () => {
    await call("create_project", { name: "Solar" }, { key: "run-7:step-2" });
    Object.assign(pendingRows()[0], { status: "executed", execution_result: { content: [{ type: "text", text: "{}" }] } });
    db.tables.agent_action_grants = [{ id: "g1", agent_connection_id: CONN_A, tool_name: "create_project", status: "active", organization_id: "org-1" }];

    const reply = await call("create_project", { name: "Solar" }, { key: "run-7:step-2" });

    expect(db.tables.projects ?? []).toHaveLength(0);
    expect(payload(reply)).toMatchObject({ status: "executed", duplicate: true });
  });

  it("says so when a call ran immediately and the key therefore protects nothing", async () => {
    const reply = await call("list_projects", {}, { key: "run-7:step-3" });

    expect(reply.result?.isError).toBeUndefined();
    expect(reply.result?._meta).toEqual({ "com.triaxisventures/idempotency": "not_applied" });
  });

  it.each([
    ["too short", "short"],
    ["too long", "k".repeat(129)],
    ["outside the character set", "run 7/step 2"],
    ["not a string", 12345678],
    ["null", null],
  ])("refuses a key that is %s before anything is created or run", async (_label, key) => {
    const critical = await call("create_project", { name: "Solar" }, { key });
    const auto = await call("create_task", { title: "Solar" }, { key });

    expect(critical.error?.code).toBe(-32602);
    expect(auto.error?.code).toBe(-32602);
    expect(pendingRows()).toHaveLength(0);
    expect(approvals()).toHaveLength(0);
    expect(db.tables.tasks ?? []).toHaveLength(0);
  });

  it("accepts keys at both length limits", async () => {
    expect(payload(await call("create_project", { name: "Solar" }, { key: "k".repeat(8) })).status).toBe("pending_approval");
    expect(payload(await call("create_project", { name: "Solar" }, { key: "k".repeat(128) })).status).toBe("pending_approval");
  });

  it("without a key, two identical calls still get two approvals and unrelated _meta is ignored", async () => {
    const first = payload(await call("create_project", { name: "Solar" }));
    const response = await send({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "create_project", arguments: { name: "Solar" }, _meta: { progressToken: 1 } } });
    const second = payload(await response.json() as Reply);

    expect(second.pendingToolCallId).not.toBe(first.pendingToolCallId);
    expect(Object.keys(first).sort()).toEqual(["approvalRequestId", "pendingToolCallId", "status"]);
    expect(approvals()).toHaveLength(2);
    expect(pendingRows()).toHaveLength(2);
    expect(pendingRows().every((row) => !String(row.idempotency_key).includes(":"))).toBe(true);
    expect((await call("list_projects", {})).result).not.toHaveProperty("_meta");
  });

  it("a revoked key is refused before the idempotency key is looked at", async () => {
    await call("create_project", { name: "Solar" }, { key: "run-7:step-2" });
    db.tables.agent_connections[0].status = "revoked";
    const response = await send({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "create_project", arguments: { name: "Solar" }, _meta: { [META_KEY]: "run-7:step-2" } } });

    expect(response.status).toBe(401);
    expect(approvals()).toHaveLength(1);
  });

  it("a retry without the tool's capability is refused and does not reveal the pending call", async () => {
    await call("create_project", { name: "Solar" }, { key: "run-7:step-2" });
    db.tables.agent_connections[0].capabilities = ["get_pending_tool_call"];
    const reply = await call("create_project", { name: "Solar" }, { key: "run-7:step-2" });

    expect(reply.error?.code).toBe(-32001);
    expect(JSON.stringify(reply)).not.toContain(String(pendingRows()[0].id));
  });
});

describe("get_pending_tool_call", () => {
  async function pendingId() {
    return String(payload(await call("create_project", { name: "Solar" }, { key: "run-7:step-2" })).pendingToolCallId);
  }
  const read = (id: string, apiKey?: string) => call("get_pending_tool_call", { pending_tool_call_id: id }, { apiKey });

  it("is an auto tool behind an opt-in capability that existing and default keys do not have", () => {
    expect(getAgentTool("get_pending_tool_call")).toMatchObject({ criticality: "auto", requiredCapability: "get_pending_tool_call" });
    expect(allAgentCapabilities).toContain("get_pending_tool_call");
    expect(defaultAgentCapabilities).not.toContain("get_pending_tool_call");
  });

  it("reports a call that still waits for a decision, and writes nothing but its audit row", async () => {
    const id = await pendingId();
    expect(payload(await read(id))).toMatchObject({ pendingToolCallId: id, toolName: "create_project", status: "pending_approval", decidedAt: null, result: null });
    expect(pendingRows()).toHaveLength(1);
    expect(approvals()).toHaveLength(1);
  });

  it("reports an executed call with its decision time and result", async () => {
    const id = await pendingId();
    const result = { content: [{ type: "text", text: "{\"id\":\"project-1\"}" }] };
    Object.assign(pendingRows()[0], { status: "executed", decided_at: "2026-11-25T11:00:00.000Z", execution_result: result });
    expect(payload(await read(id))).toMatchObject({ status: "executed", decidedAt: "2026-11-25T11:00:00.000Z", result });
  });

  it.each([["null", null], ["an empty object", {}]])("reports executed with %s as the result as unknown, not success", async (_label, empty) => {
    const id = await pendingId();
    Object.assign(pendingRows()[0], { status: "executed", decided_at: "2026-11-25T11:00:00.000Z", execution_result: empty });

    expect(payload(await read(id))).toMatchObject({ status: "unknown", decidedAt: "2026-11-25T11:00:00.000Z", result: null });
    // A retry with the key must not claim success either.
    expect(payload(await call("create_project", { name: "Solar" }, { key: "run-7:step-2" })).status).toBe("unknown");
  });

  it("reports rejected and failed calls with their reasons", async () => {
    const id = await pendingId();
    Object.assign(pendingRows()[0], { status: "rejected", decided_at: "2026-11-25T11:00:00.000Z", execution_result: { rejected: true, reason: "Not now" } });
    expect(payload(await read(id))).toMatchObject({ status: "rejected", result: { reason: "Not now" } });
    Object.assign(pendingRows()[0], { status: "failed", execution_result: { error: "boom" } });
    expect(payload(await read(id))).toMatchObject({ status: "failed", result: { error: "boom" } });
  });

  it("refuses another connection, another tenant and an unknown id with the same answer", async () => {
    const id = await pendingId();
    const unknown = await read("99999999-0000-4000-8000-000000000099");

    expect(unknown.result?.isError).toBe(true);
    expect(await read(id, KEY_B)).toEqual(unknown);
    expect(await read(id, KEY_OTHER_ORG)).toEqual(unknown);
    expect(await read("not-a-uuid")).toEqual(unknown);
  });

  it("refuses a connection without the capability and does not list the tool for it", async () => {
    const id = await pendingId();
    expect((await read(id)).result?.isError).toBeUndefined();
    db.tables.agent_connections[0].capabilities = [...defaultAgentCapabilities];
    expect((await read(id)).error?.code).toBe(-32001);

    const list = await (await send({ jsonrpc: "2.0", id: 1, method: "tools/list" })).json() as { result: { tools: Array<{ name: string }> } };
    expect(list.result.tools.map((tool) => tool.name)).not.toContain("get_pending_tool_call");
  });

  it("refuses a revoked key", async () => {
    const id = await pendingId();
    expect((await read(id)).result?.isError).toBeUndefined();
    db.tables.agent_connections[0].status = "revoked";
    const response = await send({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_pending_tool_call", arguments: { pending_tool_call_id: id } } });
    expect(response.status).toBe(401);
  });
});

// MCP 2025-06-18, Streamable HTTP, "Sending Messages to the Server": an accepted notification gets
// 202 with no body.
describe("JSON-RPC notifications", () => {
  it.each(["notifications/initialized", "notifications/cancelled"])("accepts %s with 202 and no body", async (method) => {
    const response = await send({ jsonrpc: "2.0", method });
    expect(await response.text()).toBe("");
    expect(response.status).toBe(202);
  });

  it("still requires a valid key", async () => {
    expect((await send({ jsonrpc: "2.0", method: "notifications/initialized" }, "axa_live_unknown")).status).toBe(401);
  });

  it("leaves requests that carry an id unchanged", async () => {
    const body = await (await send({ jsonrpc: "2.0", id: 4, method: "notifications/initialized" })).json() as Reply;
    expect(body.error?.code).toBe(-32601);
  });
});
