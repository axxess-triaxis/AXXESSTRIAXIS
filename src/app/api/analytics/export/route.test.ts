import { afterEach, describe, expect, it, vi } from "vitest";

// Analytics Sprint 3: mirrors /api/approvals/export/route.test.ts -- the actual export file is
// generated client-side; this route's only job is writing a real, tenant-scoped audit event for
// the export action, which this test proves happens with the right actor/action/tenant.
const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string }; accessToken?: string },
};

vi.mock("../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

const recordedAudits: Array<{ action: string; resourceType?: string; category?: string; metadata?: Record<string, unknown> }> = [];
vi.mock("../../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
  auditLogsRepository: {
    record: async (_scope: unknown, input: { action: string; resourceType?: string; category?: string; metadata?: Record<string, unknown> }) => {
      recordedAudits.push(input);
      return { id: "audit-export-1" };
    },
  },
}));

import { POST } from "./route";

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/analytics/export", { method: "POST", body: JSON.stringify(body) });
}

describe("POST /api/analytics/export (Analytics Sprint 3)", () => {
  afterEach(() => {
    state.session = null;
    recordedAudits.length = 0;
  });

  it("returns 401 for an unauthenticated request", async () => {
    const response = await POST(request({ projectCount: 3 }));
    expect(response.status).toBe(401);
  });

  it("writes a real, tenant-scoped audit event for the export action", async () => {
    state.session = { user: { id: "user-1", organizationId: "org-1", role: "Manager" } };

    const response = await POST(request({ projectCount: 5, dataMode: "live", filters: { risk: "high" } }));
    const body = await response.json() as { ok: boolean; auditLogId?: string };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.auditLogId).toBe("audit-export-1");
    expect(recordedAudits).toHaveLength(1);
    expect(recordedAudits[0].action).toBe("analytics.export_report");
    expect(recordedAudits[0].resourceType).toBe("analytics_report");
    expect(recordedAudits[0].metadata?.projectCount).toBe(5);
    expect(recordedAudits[0].metadata?.dataMode).toBe("live");
    expect(recordedAudits[0].metadata?.filters).toEqual({ risk: "high" });
  });
});
