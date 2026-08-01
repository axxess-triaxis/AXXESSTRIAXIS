import { afterEach, describe, expect, it, vi } from "vitest";

// Admin panel wiring pass (2026-07-25): this route was already real, but had zero route-level
// test coverage. Added since the admin "Create dry-run job"/"Review sandbox policy"/"Inspect
// Kubernetes spec" actions now call it directly.
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

describe("GET/POST /api/execution/jobs", () => {
  afterEach(() => {
    state.session = null;
    vi.clearAllMocks();
  });

  it("GET requires an authenticated session", async () => {
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("GET returns security-tier policies, a sample dry-run, and a summary", async () => {
    state.session = { user: user("user-1", "Organization Admin") };
    const response = await GET();
    const body = await response.json() as { policies: { standard: unknown; restricted: unknown; regulated: unknown }; sampleRun: { sandboxSpec: unknown }; summary: unknown };

    expect(response.status).toBe(200);
    expect(body.policies.standard).toBeTruthy();
    expect(body.policies.restricted).toBeTruthy();
    expect(body.policies.regulated).toBeTruthy();
    expect(body.sampleRun.sandboxSpec).toBeTruthy();
    expect(body.summary).toBeTruthy();
  });

  it("POST requires an authenticated session", async () => {
    const request = new Request("https://example.com/api/execution/jobs", {
      method: "POST",
      body: JSON.stringify({ kind: "ai_tool" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("POST creates a job and returns its dry-run", async () => {
    state.session = { user: user("user-1", "Organization Admin") };
    const request = new Request("https://example.com/api/execution/jobs", {
      method: "POST",
      body: JSON.stringify({ kind: "ai_tool", title: "Test job", requestedAction: "dry-run" }),
    });
    const response = await POST(request);
    const body = await response.json() as { job: { title: string }; run: { status: string } };

    expect(response.status).toBe(200);
    expect(body.job.title).toBe("Test job");
    expect(body.run.status).toBeTruthy();
  });
});
