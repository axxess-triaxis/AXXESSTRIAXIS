import { afterEach, describe, expect, it, vi } from "vitest";

// Q-006: the deletion-request route previously only wrote an audit log (no privacy_requests row,
// no execution plan). This proves the honest queued-state fix: a real row is inserted with a real,
// computed erasure execution plan, and the request stays audit-logged under the same action name.
const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string }; accessToken?: string },
  adminConfigured: true,
  insertShouldFail: false,
  insertedRows: [] as Array<{ table: string; body: unknown }>,
  recordedAuditLogs: [] as Array<{ scope: unknown; input: unknown }>,
};

vi.mock("../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

vi.mock("../../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }, accessToken?: string) => ({
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
    accessToken,
  }),
  auditLogsRepository: {
    record: async (scope: unknown, input: unknown) => {
      state.recordedAuditLogs.push({ scope, input });
      return { id: "audit-log-1" };
    },
  },
}));

vi.mock("../../../../repositories/supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => state.adminConfigured,
  supabaseAdminRest: async (table: string, options?: { body?: unknown }) => {
    if (state.insertShouldFail) throw new Error("Supabase admin request failed for privacy_requests: 500");
    state.insertedRows.push({ table, body: options?.body });
    return [{ id: "privacy-request-1" }];
  },
}));

import { POST } from "./route";

function user(organizationId: string) {
  return { id: "user-1", organizationId, role: "Employee", accessToken: "token" };
}

describe("POST /api/account/deletion-request (Q-006 honest queued-state fix)", () => {
  afterEach(() => {
    state.session = null;
    state.adminConfigured = true;
    state.insertShouldFail = false;
    state.insertedRows = [];
    state.recordedAuditLogs = [];
  });

  it("returns 401 for an unauthenticated request", async () => {
    const response = await POST();
    expect(response.status).toBe(401);
  });

  it("inserts a real privacy_requests row with a real erasure execution plan and audit-logs the request once", async () => {
    state.session = { user: user("org-1") };

    const response = await POST();
    const body = await response.json() as { ok: boolean; requestId?: string };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.requestId).toBe("privacy-request-1");

    expect(state.insertedRows).toHaveLength(1);
    const inserted = state.insertedRows[0] as { table: string; body: Record<string, unknown> };
    expect(inserted.table).toBe("privacy_requests");
    expect(inserted.body.organization_id).toBe("org-1");
    expect(inserted.body.request_type).toBe("erasure");
    expect(inserted.body.status).toBe("queued");
    expect(Array.isArray(inserted.body.execution_plan)).toBe(true);
    expect((inserted.body.execution_plan as unknown[]).length).toBeGreaterThan(0);

    // Exactly one audit log write -- the old fire-and-forget call is folded into this one, not doubled.
    expect(state.recordedAuditLogs).toHaveLength(1);
    const logged = state.recordedAuditLogs[0].input as Record<string, unknown>;
    expect(logged.action).toBe("account.deletion.requested");
    expect(logged.resourceId).toBe("privacy-request-1");
  });

  it("still audit-logs under the caller's own user id and returns 200 when Supabase admin is not configured", async () => {
    state.session = { user: user("org-1") };
    state.adminConfigured = false;

    const response = await POST();
    const body = await response.json() as { ok: boolean; requestId?: string };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.requestId).toBeUndefined();
    expect(state.insertedRows).toHaveLength(0);
    expect(state.recordedAuditLogs).toHaveLength(1);
    expect((state.recordedAuditLogs[0].input as Record<string, unknown>).resourceId).toBe("user-1");
  });

  it("never claims 'queued' when the insert itself fails -- Supabase admin is configured but the write throws", async () => {
    state.session = { user: user("org-1") };
    state.insertShouldFail = true;

    const response = await POST();
    const body = await response.json() as { ok: boolean; requestId?: string; message: string };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.requestId).toBeUndefined();
    expect(body.message).not.toMatch(/queued and planned/i);
    expect(body.message).toMatch(/could not be persisted/i);

    expect(state.recordedAuditLogs).toHaveLength(1);
    const logged = state.recordedAuditLogs[0].input as Record<string, unknown>;
    expect((logged.metadata as Record<string, unknown>).persisted).toBe(false);
  });
});
