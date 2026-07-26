import { afterEach, describe, expect, it, vi } from "vitest";

// RAG Remediation Sprint 3 (A-60 precondition): real approval_requests rows already exist
// (created from an approved AI Review Inbox item), but the live Approvals & Governance page never
// fetched them. This route is what makes a real Export Report possible.
const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string }; accessToken?: string },
  approvals: [] as Array<{ id: string; organizationId: string; title: string }>,
};

vi.mock("../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

vi.mock("../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
}));

const listCalls: Array<{ organizationId: string }> = [];
vi.mock("../../../repositories/workflowActionRepositories", () => ({
  approvalRequestsRepository: {
    list: async (scope: { organizationId: string }) => {
      listCalls.push({ organizationId: scope.organizationId });
      return state.approvals.filter((approval) => approval.organizationId === scope.organizationId);
    },
  },
}));

import { GET } from "./route";

function user(organizationId: string) {
  return { id: "user-1", organizationId, role: "Employee", accessToken: "token" };
}

describe("GET /api/approvals (RAG Remediation Sprint 3, A-60 precondition)", () => {
  afterEach(() => {
    state.session = null;
    state.approvals = [];
    listCalls.length = 0;
  });

  it("returns 401 for an unauthenticated request", async () => {
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns only the caller's own organization's approval requests", async () => {
    state.session = { user: user("org-1") };
    state.approvals = [
      { id: "approval-1", organizationId: "org-1", title: "Org 1 approval" },
      { id: "approval-2", organizationId: "org-2", title: "Org 2 approval" },
    ];

    const response = await GET();
    const body = await response.json() as { approvals: Array<{ id: string }> };

    expect(response.status).toBe(200);
    expect(body.approvals.map((approval) => approval.id)).toEqual(["approval-1"]);
    expect(listCalls).toEqual([{ organizationId: "org-1" }]);
  });
});
