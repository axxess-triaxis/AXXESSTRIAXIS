import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string }; accessToken?: string },
  snapshotByOrg: {} as Record<string, {
    activity: unknown[]; fullActivity: Array<{ createdAt: string; provider: string; toolName: string; status: string; agentConnectionId?: string; errorMessage?: string }>;
    pendingApprovals: unknown[]; roster: unknown[]; summary: Record<string, unknown>;
  }>,
  auditCalls: [] as Array<{ scope: unknown; input: Record<string, unknown> }>,
};

vi.mock("../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

vi.mock("../../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
  auditLogsRepository: {
    record: async (scope: unknown, input: Record<string, unknown>) => {
      state.auditCalls.push({ scope, input });
      return { id: "audit-export-1" };
    },
  },
}));

vi.mock("../../../../services/agents/agentGovernanceSnapshot", () => ({
  buildAgentGovernanceSnapshot: async (organizationId: string) =>
    state.snapshotByOrg[organizationId] ?? { activity: [], fullActivity: [], pendingApprovals: [], roster: [], summary: {} },
}));

import { POST } from "./route";

function user(role: string, organizationId = "org-1") {
  return { id: "user-1", organizationId, role };
}

describe("POST /api/agents/export", () => {
  afterEach(() => {
    state.session = null;
    state.snapshotByOrg = {};
    state.auditCalls = [];
    vi.clearAllMocks();
  });

  it("requires an authenticated admin session", async () => {
    expect((await POST()).status).toBe(401);

    state.session = { user: user("Manager") };
    expect((await POST()).status).toBe(403);
  });

  it("MCP3-3: export payload is scoped to the caller's own organization only", async () => {
    state.session = { user: user("Organization Admin", "org-7") };
    state.snapshotByOrg = {
      "org-7": {
        activity: [], pendingApprovals: [],
        fullActivity: [{ createdAt: "2026-08-14T10:00:00.000Z", provider: "openai", toolName: "list_tasks", status: "success" }],
        roster: [{ connectionId: "conn-org7", provider: "openai" }],
        summary: { activeAgents: 1 },
      },
      "org-8": {
        activity: [], pendingApprovals: [],
        fullActivity: [{ createdAt: "2026-08-14T10:00:00.000Z", provider: "anthropic", toolName: "create_task", status: "success" }],
        roster: [{ connectionId: "conn-org8", provider: "anthropic" }],
        summary: { activeAgents: 1 },
      },
    };

    const response = await POST();
    const body = await response.json() as { json: { organizationId: string; roster: Array<{ connectionId: string }> }; csv: string };

    expect(response.status).toBe(200);
    expect(body.json.organizationId).toBe("org-7");
    expect(body.json.roster).toEqual([{ connectionId: "conn-org7", provider: "openai" }]);
    expect(body.csv).toContain("openai");
    expect(body.csv).not.toContain("anthropic");
    expect(JSON.stringify(body)).not.toContain("org-8");
    expect(JSON.stringify(body)).not.toContain("conn-org8");
  });

  it("MCP3-3: export response never contains a raw key or key hash", async () => {
    state.session = { user: user("Organization Admin", "org-7") };
    state.snapshotByOrg = {
      "org-7": {
        activity: [], pendingApprovals: [],
        fullActivity: [{ createdAt: "2026-08-14T10:00:00.000Z", provider: "openai", toolName: "list_tasks", status: "success" }],
        roster: [{ connectionId: "conn-1", provider: "openai", label: "Prod key", apiKeyPrefix: undefined }],
        summary: {},
      },
    };

    const response = await POST();
    const bodyText = JSON.stringify(await response.json());

    expect(bodyText).not.toMatch(/api_key_hash|apiKeyHash/i);
    expect(bodyText).not.toContain("axa_live_");
  });

  it("records a tenant-scoped audit-log event for the export action", async () => {
    state.session = { user: user("Organization Admin", "org-7") };
    state.snapshotByOrg = { "org-7": { activity: [], fullActivity: [], pendingApprovals: [], roster: [], summary: {} } };

    await POST();

    expect(state.auditCalls).toHaveLength(1);
    expect(state.auditCalls[0].input.action).toBe("agent_governance.export");
    expect(state.auditCalls[0].input.category).toBe("agentic-infrastructure");
  });
});
