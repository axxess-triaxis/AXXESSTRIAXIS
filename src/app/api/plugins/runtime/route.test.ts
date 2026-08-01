import { afterEach, describe, expect, it, vi } from "vitest";

// Admin panel wiring pass (2026-07-25): this route was already real and tested at the service
// layer (pluginRuntime.test.ts), but had zero route-level coverage proving GET/POST behave
// correctly for an authenticated caller -- added here since the admin panel's "Review plugin
// scopes"/"Approve connector action"/"Revoke provider access" buttons now call it directly.
const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string }; accessToken?: string },
};

vi.mock("../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

vi.mock("../../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
  auditLogsRepository: { record: async () => ({ id: "audit-1" }) },
}));

vi.mock("../../../../repositories/supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => false,
  supabaseAdminRest: async () => undefined,
}));

import { GET, POST } from "./route";

function user(id: string, role: string) {
  return { id, organizationId: "org-1", role, accessToken: "token" };
}

describe("GET/POST /api/plugins/runtime", () => {
  afterEach(() => {
    state.session = null;
    vi.clearAllMocks();
  });

  it("GET requires an authenticated session", async () => {
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("GET returns a plugin runtime snapshot for the caller's organization", async () => {
    state.session = { user: user("user-1", "Organization Admin") };
    const response = await GET();
    const body = await response.json() as { totals?: unknown; contracts?: unknown[] };

    expect(response.status).toBe(200);
    expect(body.totals).toBeTruthy();
    expect(Array.isArray(body.contracts)).toBe(true);
  });

  it("POST requires an authenticated session", async () => {
    const request = new Request("https://example.com/api/plugins/runtime", {
      method: "POST",
      body: JSON.stringify({ pluginId: "notion", action: "sync" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("POST requires pluginId and action", async () => {
    state.session = { user: user("user-1", "Organization Admin") };
    const request = new Request("https://example.com/api/plugins/runtime", { method: "POST", body: JSON.stringify({}) });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("POST evaluates a plugin action and returns a decision", async () => {
    state.session = { user: user("user-1", "Organization Admin") };
    const request = new Request("https://example.com/api/plugins/runtime", {
      method: "POST",
      body: JSON.stringify({ pluginId: "notion", action: "sync" }),
    });
    const response = await POST(request);
    const body = await response.json() as { decision: { allowed: boolean }; totals: unknown };

    expect(response.status).toBe(200);
    expect(typeof body.decision.allowed).toBe("boolean");
    expect(body.totals).toBeTruthy();
  });
});
