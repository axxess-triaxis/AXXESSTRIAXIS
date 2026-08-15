import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string } },
  auditRows: [] as unknown[],
  approvalRows: [] as unknown[],
  grants: [] as unknown[],
  connections: [] as unknown[],
  profiles: [] as unknown[],
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

vi.mock("../../../../services/agents/agentConnectionRepository", () => ({
  listAgentConnections: async () => state.connections,
}));

vi.mock("../../../../services/agents/agentProfileRepository", () => ({
  listAgentProfiles: async () => state.profiles,
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
    state.connections = [];
    state.profiles = [];
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

  // MCP3-3: governance-dashboard additions -- roster, activeAgents/activeProviders, approved/
  // rejected/pending split. All sourced from the same organization-scoped fetches as the rest of
  // this route (mocked repositories below are themselves org-agnostic in this test, but the route's
  // only org-scoping mechanism is passing session.user.organizationId through to every call --
  // covered by the "eq.org-7" assertion in the test above for the audit_logs/approval_requests path;
  // this test focuses on the roster/summary computation itself).
  it("MCP3-3: roster and governance summary fields (active agents/providers, risk tier, approval split)", async () => {
    state.session = { user: user("Organization Admin", "org-7") };
    state.auditRows = [];
    state.approvalRows = [
      { id: "approval-1", title: "a", status: "approved", priority: "high", metadata: { agentConnectionId: "conn-1" }, created_at: "2026-08-14T10:00:00.000Z" },
      { id: "approval-2", title: "b", status: "rejected", priority: "high", metadata: { agentConnectionId: "conn-1" }, created_at: "2026-08-14T10:01:00.000Z" },
      { id: "approval-3", title: "c", status: "pending", priority: "high", metadata: { agentConnectionId: "conn-2" }, created_at: "2026-08-14T10:02:00.000Z" },
      { id: "approval-4", title: "d (not agent-originated)", status: "approved", priority: "low", metadata: {}, created_at: "2026-08-14T10:03:00.000Z" },
    ];
    state.connections = [
      { id: "conn-1", label: "Prod OpenAI", provider: "openai", status: "active", lastUsedAt: "2026-08-14T09:00:00.000Z", agentProfileId: "profile-1" },
      { id: "conn-2", label: "Prod Anthropic", provider: "anthropic", status: "active", lastUsedAt: "2026-08-14T08:00:00.000Z", agentProfileId: undefined },
      { id: "conn-3", label: "Old key", provider: "openai", status: "revoked", lastUsedAt: "2026-07-01T00:00:00.000Z", agentProfileId: undefined },
    ];
    state.profiles = [{ id: "profile-1", riskTier: "elevated" }];

    const response = await GET();
    const body = await response.json() as {
      roster: Array<{ connectionId: string; provider: string; status: string; riskTier: string }>;
      summary: { activeAgents: number; activeProviders: number; approvalCount: number; approvals: { approved: number; rejected: number; pending: number } };
    };

    expect(response.status).toBe(200);
    expect(body.roster).toHaveLength(3);
    expect(body.roster[0].connectionId).toBe("conn-1"); // active + more recently used sorts first
    expect(body.roster.find((row) => row.connectionId === "conn-1")?.riskTier).toBe("elevated");
    expect(body.roster.find((row) => row.connectionId === "conn-2")?.riskTier).toBe("unassigned");
    expect(body.roster.find((row) => row.connectionId === "conn-3")?.status).toBe("revoked");
    expect(body.summary.activeAgents).toBe(2); // conn-1 + conn-2, not the revoked conn-3
    expect(body.summary.activeProviders).toBe(2); // openai + anthropic among active connections
    expect(body.summary.approvalCount).toBe(3); // agent-originated only, excludes approval-4
    expect(body.summary.approvals).toEqual({ approved: 1, rejected: 1, pending: 1 });
  });
});
