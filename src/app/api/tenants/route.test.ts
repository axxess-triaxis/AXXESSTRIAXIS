import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string }; accessToken?: string },
  adminConfigured: true,
  // Real membership rows this "user" actually belongs to -- the source of truth the route must
  // check the client-supplied organizationId against before ever trusting it.
  activeMemberships: [] as { organization_id: string; status: string }[],
  patchCalls: [] as { table: string; options: Record<string, unknown> }[],
};

vi.mock("../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

vi.mock("../../../auth/supabaseUser", () => ({
  normalizeRole: (value: string | undefined) => value ?? "Employee",
}));

vi.mock("../../../repositories/supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => state.adminConfigured,
  supabaseAdminRest: async (table: string, options: { method?: string; query?: URLSearchParams }) => {
    if (table === "organization_members") {
      const requestedOrgId = options.query?.get("organization_id")?.replace("eq.", "");
      return state.activeMemberships.filter((m) => !requestedOrgId || m.organization_id === requestedOrgId);
    }
    if (table === "user_roles") return [];
    if (table === "users" && options.method === "PATCH") {
      state.patchCalls.push({ table, options: options as unknown as Record<string, unknown> });
      return {};
    }
    return [];
  },
}));

vi.mock("../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
  auditLogsRepository: { record: async () => ({ id: "audit-1" }) },
}));

import { POST } from "./route";

function jsonRequest(body: unknown): Request {
  return new Request("https://app.axxess.dev/api/tenants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// MN-5 (2026-08-23): POST /api/tenants is the one route in this codebase confirmed (during this
// sprint's security research) to accept a client-supplied organizationId at all -- every other
// route derives tenant scope purely from the server-side session. This is the real, concrete test
// for the sprint's own required assertion: "tenant ID cannot be overridden from client payload."
// The route must cross-check the requested organizationId against a real active
// organization_members row for this exact user before ever trusting it -- not accept it on faith.
describe("POST /api/tenants (MN-5: tenant ID cannot be overridden from client payload)", () => {
  afterEach(() => {
    state.session = null;
    state.adminConfigured = true;
    state.activeMemberships = [];
    state.patchCalls = [];
  });

  it("requires a session (401 with no auth)", async () => {
    const res = await POST(jsonRequest({ organizationId: "org-attacker" }));
    expect(res.status).toBe(401);
  });

  it("rejects an organizationId the authenticated user has no real active membership row for, and never writes the tenant switch", async () => {
    state.session = { user: { id: "user-1", organizationId: "org-real", role: "Employee" } };
    state.activeMemberships = []; // this user belongs to no org named "org-attacker"

    const res = await POST(jsonRequest({ organizationId: "org-attacker" }));

    expect(res.status).toBe(403);
    expect(state.patchCalls).toHaveLength(0);
  });

  it("accepts an organizationId only when a real active membership row proves the user actually belongs to it", async () => {
    state.session = { user: { id: "user-1", organizationId: "org-real", role: "Employee" } };
    state.activeMemberships = [{ organization_id: "org-real-2", status: "active" }];

    const res = await POST(jsonRequest({ organizationId: "org-real-2" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.user.organizationId).toBe("org-real-2");
    expect(state.patchCalls).toHaveLength(1);
  });
});
