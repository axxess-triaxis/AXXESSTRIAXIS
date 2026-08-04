import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string }; accessToken?: string },
  rules: [] as Array<Record<string, unknown>>,
  createCalls: [] as Array<Record<string, unknown>>,
  auditCalls: [] as Array<Record<string, unknown>>,
};

vi.mock("../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

vi.mock("../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
  auditLogsRepository: {
    record: async (_scope: unknown, input: Record<string, unknown>) => {
      state.auditCalls.push(input);
      return { id: "audit-1", ...input };
    },
  },
}));

vi.mock("../../../repositories/socialAlertRulesRepository", () => ({
  listSocialAlertRules: async () => state.rules,
  createSocialAlertRule: async (_scope: unknown, input: Record<string, unknown>) => {
    state.createCalls.push(input);
    return { id: "rule-1", organizationId: "org-1", createdAt: "2026-08-04T00:00:00.000Z", ...input };
  },
}));

import { GET, POST } from "./route";

function user(id: string, role: string, organizationId = "org-1") {
  return { id, organizationId, role };
}

function postRequest(body: Record<string, unknown>) {
  return new Request("https://example.com/api/social-alert-rules", { method: "POST", body: JSON.stringify(body) });
}

describe("GET /api/social-alert-rules", () => {
  afterEach(() => {
    state.session = null;
    state.rules = [];
    state.createCalls = [];
    state.auditCalls = [];
    vi.clearAllMocks();
  });

  it("requires an authenticated session", async () => {
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns a genuinely empty list for a tenant with no rules", async () => {
    state.session = { user: user("user-1", "Manager") };
    state.rules = [];
    const response = await GET();
    const body = await response.json() as { rules: unknown[] };
    expect(response.status).toBe(200);
    expect(body.rules).toEqual([]);
  });
});

describe("POST /api/social-alert-rules", () => {
  afterEach(() => {
    state.session = null;
    state.rules = [];
    state.createCalls = [];
    state.auditCalls = [];
    vi.clearAllMocks();
  });

  it("requires an authenticated session", async () => {
    const response = await POST(postRequest({ provider: "facebook", keyword: "x", topic: "y" }));
    expect(response.status).toBe(401);
  });

  it("rejects an invalid provider", async () => {
    state.session = { user: user("user-1", "Manager") };
    const response = await POST(postRequest({ provider: "myspace", keyword: "x", topic: "y" }));
    expect(response.status).toBe(400);
  });

  it("rejects a missing keyword", async () => {
    state.session = { user: user("user-1", "Manager") };
    const response = await POST(postRequest({ provider: "facebook", topic: "y" }));
    expect(response.status).toBe(400);
  });

  it("rejects a missing topic", async () => {
    state.session = { user: user("user-1", "Manager") };
    const response = await POST(postRequest({ provider: "facebook", keyword: "x" }));
    expect(response.status).toBe(400);
  });

  it("rejects an invalid urgency", async () => {
    state.session = { user: user("user-1", "Manager") };
    const response = await POST(postRequest({ provider: "facebook", keyword: "x", topic: "y", urgency: "extreme" }));
    expect(response.status).toBe(400);
  });

  it("creates a rule scoped to the caller's organization and records an audit entry", async () => {
    state.session = { user: user("user-1", "Manager") };
    const response = await POST(postRequest({ provider: "facebook", keyword: "oxygen resilience", topic: "healthcare funding", urgency: "high" }));
    const body = await response.json() as { rule: { keyword: string; topic: string; urgency: string } };

    expect(response.status).toBe(201);
    expect(body.rule.keyword).toBe("oxygen resilience");
    expect(body.rule.urgency).toBe("high");
    expect(state.createCalls).toEqual([{ provider: "facebook", keyword: "oxygen resilience", topic: "healthcare funding", urgency: "high" }]);
    expect(state.auditCalls).toHaveLength(1);
    expect(state.auditCalls[0].action).toBe("social_alert_rule.created");
  });

  it("defaults urgency to undefined when not provided, letting the repository apply its own default", async () => {
    state.session = { user: user("user-1", "Manager") };
    await POST(postRequest({ provider: "facebook", keyword: "x", topic: "y" }));
    expect(state.createCalls[0].urgency).toBeUndefined();
  });
});
