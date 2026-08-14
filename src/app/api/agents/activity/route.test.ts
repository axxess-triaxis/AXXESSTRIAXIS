import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string } },
  auditRows: [] as unknown[],
  approvalRows: [] as unknown[],
  grants: [] as unknown[],
  calls: [] as Array<{ table: string; query?: URLSearchParams }>,
};

vi.mock("../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

vi.mock("../../../../repositories/supabaseAdmin", () => ({
  supabaseAdminRest: async (table: string, options: { query?: URLSearchParams } = {}) => {
    state.calls.push({ table, query: options.query });
    if (table === "audit_logs") return state.auditRows;
    if (table === "approval_requests") return state.approvalRows;
    return [];
  },
}));

vi.mock("../../../../services/agents/agentGrantsRepository", () => ({
  listGrants: async () => state.grants,
}));

import { GET } from "./route";

function user(role: string, organizationId = "org-1") {
  return { id: "user-1", organizationId, role };
}

describe("GET /api/agents/activity", () => {
  afterEach(() => {
    state.session = null;
    state.auditRows = [];
    state.approvalRows = [];
    state.grants = [];
    state.calls = [];
    vi.clearAllMocks();
  });

  it("requires an authenticated admin session", async () => {
    expect((await GET()).status).toBe(401);

    state.session = { user: user("Manager") };
    expect((await GET()).status).toBe(403);
  });

  it("returns tenant-scoped agent activity and summary metrics from audit, approval and grant evidence", async () => {
    state.session = { user: user("Organization Admin", "org-7") };
    state.auditRows = [
      {
        id: "audit-1",
        action: "agent.openai.tool.list_tasks",
        category: "agentic-infrastructure",
        metadata: { provider: "openai", toolName: "list_tasks", success: true, agentConnectionId: "conn-1" },
        created_at: "2026-08-14T10:00:00.000Z",
      },
      {
        id: "audit-2",
        action: "agent.anthropic.tool.create_project",
        category: "agentic-infrastructure",
        metadata: { provider: "anthropic", toolName: "create_project", success: false, errorMessage: "pending_approval", agentConnectionId: "conn-2" },
        created_at: "2026-08-14T10:01:00.000Z",
      },
      {
        id: "audit-3",
        action: "agent.openai.tool.search_audit_logs",
        category: "agentic-infrastructure",
        metadata: { provider: "openai", toolName: "search_audit_logs", success: false, errorMessage: "capability not granted", agentConnectionId: "conn-1" },
        created_at: "2026-08-14T10:02:00.000Z",
      },
    ];
    state.approvalRows = [
      {
        id: "approval-1",
        title: "Agent approval",
        status: "pending",
        priority: "high",
        metadata: { provider: "anthropic", toolName: "create_project", agentConnectionId: "conn-2" },
        created_at: "2026-08-14T10:01:00.000Z",
      },
    ];
    state.grants = [{ id: "grant-1", toolName: "create_project" }];

    const response = await GET();
    const body = await response.json() as {
      activity: Array<{ status: string; provider: string; toolName: string }>;
      pendingApprovals: unknown[];
      summary: { callsByProvider: Record<string, number>; callsByTool: Record<string, number>; denials: number; pendingApprovals: number; activeGrants: number };
    };

    expect(response.status).toBe(200);
    expect(state.calls[0].query?.get("organization_id")).toBe("eq.org-7");
    expect(state.calls[0].query?.get("category")).toBe("eq.agentic-infrastructure");
    expect(body.activity.map((event) => event.status)).toEqual(["success", "pending", "denied"]);
    expect(body.summary.callsByProvider.openai).toBe(2);
    expect(body.summary.callsByTool.create_project).toBe(1);
    expect(body.summary.denials).toBe(1);
    expect(body.summary.pendingApprovals).toBe(1);
    expect(body.summary.activeGrants).toBe(1);
    expect(body.pendingApprovals).toHaveLength(1);
  });
});
