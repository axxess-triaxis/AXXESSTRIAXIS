import { afterEach, describe, expect, it, vi } from "vitest";

// Admin panel wiring pass (2026-07-25): GET previously omitted recent ai_usage_ledger rows,
// which the admin "Inspect usage ledger" action needs to render something real instead of a
// dead placeholder button.
const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string }; accessToken?: string },
  adminConfigured: true,
  usageRows: [] as unknown[],
};

vi.mock("../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

vi.mock("../../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
  auditLogsRepository: { record: async () => ({ id: "audit-1" }) },
}));

vi.mock("../../../../repositories/supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => state.adminConfigured,
  supabaseAdminRest: async () => state.usageRows,
}));

import { GET, POST } from "./route";

function user(id: string, role: string) {
  return { id, organizationId: "org-1", role, accessToken: "token" };
}

describe("GET/POST /api/ai/model-policy", () => {
  afterEach(() => {
    state.session = null;
    state.adminConfigured = true;
    state.usageRows = [];
    vi.clearAllMocks();
  });

  it("GET requires an authenticated session", async () => {
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("GET returns router status, tenant policy, and recent usage ledger rows", async () => {
    state.session = { user: user("user-1", "Organization Admin") };
    state.usageRows = [{ id: "ledger-1", provider: "anthropic" }];

    const response = await GET();
    const body = await response.json() as { organizationId: string; router: unknown; policy: unknown; recentUsage: unknown[] };

    expect(response.status).toBe(200);
    expect(body.organizationId).toBe("org-1");
    expect(body.router).toBeTruthy();
    expect(body.policy).toBeTruthy();
    expect(body.recentUsage).toEqual([{ id: "ledger-1", provider: "anthropic" }]);
  });

  it("GET returns an empty usage ledger without failing when the admin runtime is unavailable", async () => {
    state.session = { user: user("user-1", "Organization Admin") };
    state.adminConfigured = false;

    const response = await GET();
    const body = await response.json() as { recentUsage: unknown[] };

    expect(response.status).toBe(200);
    expect(body.recentUsage).toEqual([]);
  });

  it("POST requires an authenticated session", async () => {
    const request = new Request("https://example.com/api/ai/model-policy", {
      method: "POST",
      body: JSON.stringify({ prompt: "Summarize this document." }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("POST requires a prompt", async () => {
    state.session = { user: user("user-1", "Organization Admin") };
    const request = new Request("https://example.com/api/ai/model-policy", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("POST classifies a prompt and returns a routing decision", async () => {
    state.session = { user: user("user-1", "Organization Admin") };
    const request = new Request("https://example.com/api/ai/model-policy", {
      method: "POST",
      body: JSON.stringify({ prompt: "Summarize this document for the board." }),
    });
    const response = await POST(request);
    const body = await response.json() as { classification: unknown; decision: unknown };

    expect(response.status).toBe(200);
    expect(body.classification).toBeTruthy();
    expect(body.decision).toBeTruthy();
  });
});
