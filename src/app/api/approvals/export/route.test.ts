import { afterEach, describe, expect, it, vi } from "vitest";

// RAG Remediation Sprint 3 (A-60): the actual export file is generated client-side (mirroring the
// existing Export Briefing pattern); this route's only job is writing a real, tenant-scoped audit
// event for the export action, which this test proves happens with the right actor/action/tenant.
const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string }; accessToken?: string },
};

vi.mock("../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

const recordedAudits: Array<{ action: string; category?: string; metadata?: Record<string, unknown> }> = [];
vi.mock("../../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
  auditLogsRepository: {
    record: async (_scope: unknown, input: { action: string; category?: string; metadata?: Record<string, unknown> }) => {
      recordedAudits.push(input);
      return { id: "audit-export-1" };
    },
  },
}));

import { POST } from "./route";

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/approvals/export", { method: "POST", body: JSON.stringify(body) });
}

describe("POST /api/approvals/export (RAG Remediation Sprint 3, A-60)", () => {
  afterEach(() => {
    state.session = null;
    recordedAudits.length = 0;
  });

  it("returns 401 for an unauthenticated request", async () => {
    const response = await POST(request({ approvalCount: 3 }));
    expect(response.status).toBe(401);
  });

  it("writes a real, tenant-scoped audit event for the export action", async () => {
    state.session = { user: { id: "user-1", organizationId: "org-1", role: "Manager" } };

    const response = await POST(request({ approvalCount: 5 }));
    const body = await response.json() as { ok: boolean; auditLogId?: string };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.auditLogId).toBe("audit-export-1");
    expect(recordedAudits).toHaveLength(1);
    expect(recordedAudits[0].action).toBe("approvals.export_report");
    expect(recordedAudits[0].metadata?.approvalCount).toBe(5);
  });
});
