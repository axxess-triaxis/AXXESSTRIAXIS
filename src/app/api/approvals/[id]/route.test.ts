import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string } },
  decideResult: null as null | { id: string; status: string; metadata: Record<string, unknown> },
  grantCalls: [] as Array<Record<string, unknown>>,
};

vi.mock("../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

vi.mock("../../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
}));

vi.mock("../../../../repositories/workflowActionRepositories", () => ({
  approvalRequestsRepository: {
    decide: async (_scope: unknown, id: string, input: { status: string }) => {
      if (!state.decideResult) throw new Error("Approval request was not found for this organization.");
      return { ...state.decideResult, id, status: input.status };
    },
  },
}));

vi.mock("../../../../services/agents/agentGrantsRepository", () => ({
  createGrant: async (input: Record<string, unknown>) => {
    state.grantCalls.push(input);
    return { id: "grant-1", ...input };
  },
}));

import { PATCH } from "./route";

function user(id: string, role: string, organizationId = "org-1") {
  return { id, organizationId, role };
}

function patchRequest(body: Record<string, unknown>) {
  return new Request("https://example.com/api/approvals/approval-1", { method: "PATCH", body: JSON.stringify(body) });
}

describe("PATCH /api/approvals/[id]", () => {
  afterEach(() => {
    state.session = null;
    state.decideResult = null;
    state.grantCalls = [];
    vi.clearAllMocks();
  });

  it("requires an authenticated session", async () => {
    const response = await PATCH(patchRequest({ status: "approved" }), { params: Promise.resolve({ id: "approval-1" }) });
    expect(response.status).toBe(401);
  });

  it("requires a decision-capable role -- an Employee cannot decide", async () => {
    state.session = { user: user("user-1", "Employee") };
    const response = await PATCH(patchRequest({ status: "approved" }), { params: Promise.resolve({ id: "approval-1" }) });
    expect(response.status).toBe(403);
  });

  it("rejects an invalid status value", async () => {
    state.session = { user: user("user-1", "Manager") };
    const response = await PATCH(patchRequest({ status: "maybe" }), { params: Promise.resolve({ id: "approval-1" }) });
    expect(response.status).toBe(400);
  });

  it("approves a human-originated approval without creating any grant", async () => {
    state.session = { user: user("user-1", "Manager") };
    state.decideResult = { id: "approval-1", status: "pending", metadata: {} };

    const response = await PATCH(patchRequest({ status: "approved" }), { params: Promise.resolve({ id: "approval-1" }) });
    const body = await response.json() as { approval: { status: string }; grantCreated: boolean };

    expect(response.status).toBe(200);
    expect(body.approval.status).toBe("approved");
    expect(body.grantCreated).toBe(false);
    expect(state.grantCalls).toHaveLength(0);
  });

  it("approving an agent-originated approval with alwaysAllow creates a real grant scoped to that connection+tool", async () => {
    state.session = { user: user("user-1", "Organization Admin") };
    state.decideResult = { id: "approval-1", status: "pending", metadata: { agentConnectionId: "conn-1", toolName: "create_meeting" } };

    const response = await PATCH(patchRequest({ status: "approved", alwaysAllow: true }), { params: Promise.resolve({ id: "approval-1" }) });
    const body = await response.json() as { grantCreated: boolean };

    expect(body.grantCreated).toBe(true);
    expect(state.grantCalls).toEqual([{ organizationId: "org-1", agentConnectionId: "conn-1", toolName: "create_meeting", grantedByUserId: "user-1" }]);
  });

  it("rejecting never creates a grant, even with alwaysAllow set", async () => {
    state.session = { user: user("user-1", "Organization Admin") };
    state.decideResult = { id: "approval-1", status: "pending", metadata: { agentConnectionId: "conn-1", toolName: "create_meeting" } };

    const response = await PATCH(patchRequest({ status: "rejected", alwaysAllow: true }), { params: Promise.resolve({ id: "approval-1" }) });
    const body = await response.json() as { grantCreated: boolean };

    expect(body.grantCreated).toBe(false);
    expect(state.grantCalls).toHaveLength(0);
  });
});
