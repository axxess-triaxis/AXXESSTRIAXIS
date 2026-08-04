import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string } },
  deleteCalls: [] as Array<{ scope: unknown; ruleId: string }>,
  auditCalls: [] as Array<Record<string, unknown>>,
};

vi.mock("../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

vi.mock("../../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
  auditLogsRepository: {
    record: async (_scope: unknown, input: Record<string, unknown>) => {
      state.auditCalls.push(input);
      return { id: "audit-1", ...input };
    },
  },
}));

vi.mock("../../../../repositories/socialAlertRulesRepository", () => ({
  deleteSocialAlertRule: async (scope: unknown, ruleId: string) => {
    state.deleteCalls.push({ scope, ruleId });
  },
}));

import { DELETE } from "./route";

function user(id: string, role: string, organizationId = "org-1") {
  return { id, organizationId, role };
}

function deleteRequest() {
  return new Request("https://example.com/api/social-alert-rules/rule-1", { method: "DELETE" });
}

describe("DELETE /api/social-alert-rules/[id]", () => {
  afterEach(() => {
    state.session = null;
    state.deleteCalls = [];
    state.auditCalls = [];
    vi.clearAllMocks();
  });

  it("requires an authenticated session", async () => {
    const response = await DELETE(deleteRequest(), { params: Promise.resolve({ id: "rule-1" }) });
    expect(response.status).toBe(401);
  });

  it("deletes the rule scoped to the caller's organization and records an audit entry", async () => {
    state.session = { user: user("user-1", "Manager") };
    const response = await DELETE(deleteRequest(), { params: Promise.resolve({ id: "rule-1" }) });
    const body = await response.json() as { ok: boolean };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(state.deleteCalls).toHaveLength(1);
    expect(state.deleteCalls[0].ruleId).toBe("rule-1");
    expect(state.auditCalls[0].action).toBe("social_alert_rule.deleted");
  });
});
