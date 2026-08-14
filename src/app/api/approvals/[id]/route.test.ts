import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string } },
  decideResult: null as null | { id: string; status: string; metadata: Record<string, unknown> },
  decideThrows: false,
  grantCalls: [] as Array<Record<string, unknown>>,
  auditCalls: [] as Array<{ scope: unknown; input: Record<string, unknown> }>,
  // MCP3-2 (approval resume) state
  connection: { capabilities: ["create_meeting"], issuedByUserId: "issuer-1", issuedByRole: "Organization Admin" } as Record<string, unknown> | undefined,
  pendingCall: null as null | { id: string; toolName: string; toolVersion: string; provider: string; arguments: Record<string, unknown>; status: string },
  reserveSucceeds: true,
  reserveCalls: [] as Array<Record<string, unknown>>,
  finalizeCalls: [] as Array<Record<string, unknown>>,
  rejectCalls: [] as Array<Record<string, unknown>>,
  agentAuditCalls: [] as Array<{ scope: unknown; input: Record<string, unknown> }>,
  executionOutcome: { status: "executed", result: { id: "meeting-1" } } as { status: "executed"; result: unknown } | { status: "failed"; error: string },
};

vi.mock("../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

vi.mock("../../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
  auditLogsRepository: {
    record: async (scope: unknown, input: Record<string, unknown>) => {
      state.auditCalls.push({ scope, input });
      return { id: "audit-log-1" };
    },
  },
}));

vi.mock("../../../../repositories/workflowActionRepositories", () => ({
  approvalRequestsRepository: {
    // decide()'s real implementation now includes status=eq.pending in its WHERE clause, so a
    // repeat call on an already-decided row throws the same "not found" error a genuinely
    // missing/wrong-org id would. state.decideThrows lets a test simulate that CAS-miss directly
    // without needing a real database.
    decide: async (_scope: unknown, id: string, input: { status: string }) => {
      if (state.decideThrows || !state.decideResult) throw new Error("Approval request was not found, not owned by this organization, or was already decided.");
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

vi.mock("../../../../services/agents/agentConnectionRepository", () => ({
  getAgentConnectionById: async () => state.connection,
  recordAgentToolAuditEvent: async (scope: unknown, input: Record<string, unknown>) => {
    state.agentAuditCalls.push({ scope, input });
  },
}));

// MCP3-2 (approval resume): the reserve-then-finalize sequence this route now runs to execute a
// pending tool call exactly once.
vi.mock("../../../../services/agents/agentPendingToolCallRepository", () => ({
  getPendingToolCallByApprovalId: async () => state.pendingCall,
  reservePendingToolCallForExecution: async (input: Record<string, unknown>) => {
    state.reserveCalls.push(input);
    return state.reserveSucceeds && state.pendingCall ? { ...state.pendingCall, status: "executed" } : undefined;
  },
  finalizePendingToolCallExecution: async (input: Record<string, unknown>) => {
    state.finalizeCalls.push(input);
    return state.pendingCall ? { ...state.pendingCall, ...input } : undefined;
  },
  rejectPendingToolCall: async (input: Record<string, unknown>) => {
    state.rejectCalls.push(input);
    return state.pendingCall ? { ...state.pendingCall, status: "rejected" } : undefined;
  },
}));

vi.mock("../../../../services/agents/agentPendingToolCallExecutor", () => ({
  executePendingToolCall: async () => state.executionOutcome,
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
    state.decideThrows = false;
    state.grantCalls = [];
    state.auditCalls = [];
    state.connection = { capabilities: ["create_meeting"], issuedByUserId: "issuer-1", issuedByRole: "Organization Admin" };
    state.pendingCall = null;
    state.reserveSucceeds = true;
    state.reserveCalls = [];
    state.finalizeCalls = [];
    state.rejectCalls = [];
    state.agentAuditCalls = [];
    state.executionOutcome = { status: "executed", result: { id: "meeting-1" } };
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
    expect(state.auditCalls).toHaveLength(1);
    expect(state.auditCalls[0].input.action).toBe("approval.approved");
    expect(state.auditCalls[0].input.resourceType).toBe("approval_request");
    expect(state.auditCalls[0].input.resourceId).toBe("approval-1");
    expect(state.auditCalls[0].input.category).toBe("ai-governance");
  });

  it("approving an agent-originated approval with alwaysAllow creates a real grant scoped to that connection+tool", async () => {
    state.session = { user: user("user-1", "Organization Admin") };
    state.decideResult = { id: "approval-1", status: "pending", metadata: { agentConnectionId: "conn-1", toolName: "create_meeting" } };

    const response = await PATCH(patchRequest({ status: "approved", alwaysAllow: true }), { params: Promise.resolve({ id: "approval-1" }) });
    const body = await response.json() as { grantCreated: boolean };

    expect(body.grantCreated).toBe(true);
    expect(state.grantCalls).toEqual([{ organizationId: "org-1", agentConnectionId: "conn-1", toolName: "create_meeting", grantedByUserId: "user-1" }]);

    // Two audit-log writes: the approval decision itself, then the grant creation, in that order.
    expect(state.auditCalls).toHaveLength(2);
    expect(state.auditCalls[0].input.action).toBe("approval.approved");
    expect(state.auditCalls[1].input.action).toBe("agent_grant.created");
    expect(state.auditCalls[1].input.resourceType).toBe("agent_action_grant");
    expect(state.auditCalls[1].input.resourceId).toBe("grant-1");
  });

  it("rejecting never creates a grant, even with alwaysAllow set, but still audit-logs the rejection", async () => {
    state.session = { user: user("user-1", "Organization Admin") };
    state.decideResult = { id: "approval-1", status: "pending", metadata: { agentConnectionId: "conn-1", toolName: "create_meeting" } };

    const response = await PATCH(patchRequest({ status: "rejected", alwaysAllow: true, decisionReason: "Not needed right now." }), { params: Promise.resolve({ id: "approval-1" }) });
    const body = await response.json() as { grantCreated: boolean };

    expect(response.status).toBe(200);
    expect(body.grantCreated).toBe(false);
    expect(state.grantCalls).toHaveLength(0);
    expect(state.auditCalls).toHaveLength(1);
    expect(state.auditCalls[0].input.action).toBe("approval.rejected");
  });

  // MCP3-2 (2026-08-14): "approval resume" -- these prove the previously-missing execute-on-approve
  // path is real, exactly-once, and correctly separated from rejection/no-op cases.
  describe("MCP3-2: pending tool call execution (approval resume)", () => {
    it("requires a reason to reject", async () => {
      state.session = { user: user("user-1", "Manager") };
      state.decideResult = { id: "approval-1", status: "pending", metadata: {} };

      const response = await PATCH(patchRequest({ status: "rejected" }), { params: Promise.resolve({ id: "approval-1" }) });
      expect(response.status).toBe(400);
    });

    it("approving an agent-originated approval with a linked pending tool call executes it exactly once", async () => {
      state.session = { user: user("user-1", "Manager") };
      state.decideResult = { id: "approval-1", status: "pending", metadata: { agentConnectionId: "conn-1", toolName: "create_meeting" } };
      state.pendingCall = { id: "pending-1", toolName: "create_meeting", toolVersion: "1", provider: "openai", arguments: { title: "Kickoff" }, status: "pending" };

      const response = await PATCH(patchRequest({ status: "approved" }), { params: Promise.resolve({ id: "approval-1" }) });
      const body = await response.json() as { execution?: { status: string; result?: unknown } };

      expect(response.status).toBe(200);
      expect(body.execution).toEqual({ status: "executed", result: { id: "meeting-1" } });
      expect(state.reserveCalls).toHaveLength(1);
      expect(state.finalizeCalls).toHaveLength(1);
      expect(state.finalizeCalls[0]).toMatchObject({ id: "pending-1", failed: false });
      expect(state.agentAuditCalls).toHaveLength(1);
      expect(state.agentAuditCalls[0].input).toMatchObject({ toolName: "create_meeting", success: true });
    });

    it("a repeat approve on an already-decided approval does not duplicate execution", async () => {
      state.session = { user: user("user-1", "Manager") };
      state.decideResult = { id: "approval-1", status: "pending", metadata: { agentConnectionId: "conn-1", toolName: "create_meeting" } };
      state.pendingCall = { id: "pending-1", toolName: "create_meeting", toolVersion: "1", provider: "openai", arguments: { title: "Kickoff" }, status: "pending" };

      const first = await PATCH(patchRequest({ status: "approved" }), { params: Promise.resolve({ id: "approval-1" }) });
      expect(first.status).toBe(200);
      expect(state.reserveCalls).toHaveLength(1);

      // Simulate the real compare-and-swap: the first decision already succeeded, so decide()'s
      // status=eq.pending WHERE clause would now match 0 rows on a second call.
      state.decideThrows = true;
      const second = await PATCH(patchRequest({ status: "approved" }), { params: Promise.resolve({ id: "approval-1" }) });
      const secondBody = await second.json() as { alreadyDecided?: boolean };

      expect(second.status).toBe(409);
      expect(secondBody.alreadyDecided).toBe(true);
      // The executor was never invoked a second time -- reserveCalls stays at 1 from the first
      // request, since the second request never got past decide() to reach the execution branch.
      expect(state.reserveCalls).toHaveLength(1);
      expect(state.finalizeCalls).toHaveLength(1);
    });

    it("if the reservation itself loses a race (0 rows), this request does not re-execute or re-finalize", async () => {
      state.session = { user: user("user-1", "Manager") };
      state.decideResult = { id: "approval-1", status: "pending", metadata: { agentConnectionId: "conn-1", toolName: "create_meeting" } };
      state.pendingCall = { id: "pending-1", toolName: "create_meeting", toolVersion: "1", provider: "openai", arguments: { title: "Kickoff" }, status: "pending" };
      state.reserveSucceeds = false;

      const response = await PATCH(patchRequest({ status: "approved" }), { params: Promise.resolve({ id: "approval-1" }) });
      const body = await response.json() as { execution?: unknown };

      expect(response.status).toBe(200);
      expect(body.execution).toBeUndefined();
      expect(state.reserveCalls).toHaveLength(1);
      expect(state.finalizeCalls).toHaveLength(0);
      expect(state.agentAuditCalls).toHaveLength(0);
    });

    it("rejecting a pending tool call marks it rejected and never executes it", async () => {
      state.session = { user: user("user-1", "Manager") };
      state.decideResult = { id: "approval-1", status: "pending", metadata: { agentConnectionId: "conn-1", toolName: "create_meeting" } };
      state.pendingCall = { id: "pending-1", toolName: "create_meeting", toolVersion: "1", provider: "openai", arguments: { title: "Kickoff" }, status: "pending" };

      const response = await PATCH(patchRequest({ status: "rejected", decisionReason: "Not appropriate right now." }), { params: Promise.resolve({ id: "approval-1" }) });
      const body = await response.json() as { execution?: { status: string } };

      expect(response.status).toBe(200);
      expect(body.execution).toEqual({ status: "rejected" });
      expect(state.rejectCalls).toHaveLength(1);
      expect(state.rejectCalls[0]).toMatchObject({ id: "pending-1", reason: "Not appropriate right now." });
      expect(state.reserveCalls).toHaveLength(0);
      expect(state.finalizeCalls).toHaveLength(0);
      expect(state.agentAuditCalls).toHaveLength(0);
    });

    it("a failed tool execution finalizes the pending call as failed, not executed", async () => {
      state.session = { user: user("user-1", "Manager") };
      state.decideResult = { id: "approval-1", status: "pending", metadata: { agentConnectionId: "conn-1", toolName: "create_meeting" } };
      state.pendingCall = { id: "pending-1", toolName: "create_meeting", toolVersion: "1", provider: "openai", arguments: { title: "Kickoff" }, status: "pending" };
      state.executionOutcome = { status: "failed", error: "simulated failure" };

      const response = await PATCH(patchRequest({ status: "approved" }), { params: Promise.resolve({ id: "approval-1" }) });
      const body = await response.json() as { execution?: { status: string; error?: string } };

      expect(body.execution).toEqual({ status: "failed", error: "simulated failure" });
      expect(state.finalizeCalls[0]).toMatchObject({ id: "pending-1", failed: true });
      expect(state.agentAuditCalls[0].input).toMatchObject({ success: false, errorMessage: "simulated failure" });
    });

    it("a plain human-originated approval with no linked pending tool call has no execution field", async () => {
      state.session = { user: user("user-1", "Manager") };
      state.decideResult = { id: "approval-1", status: "pending", metadata: {} };
      state.pendingCall = null;

      const response = await PATCH(patchRequest({ status: "approved" }), { params: Promise.resolve({ id: "approval-1" }) });
      const body = await response.json() as { execution?: unknown };

      expect(body.execution).toBeUndefined();
      expect(state.reserveCalls).toHaveLength(0);
    });

    it("a cross-tenant decide (wrong organization) is rejected the same way as an unknown id, before any execution", async () => {
      state.session = { user: user("user-1", "Manager", "org-1") };
      state.decideThrows = true; // simulates decide()'s organization_id filter matching 0 rows
      state.pendingCall = { id: "pending-1", toolName: "create_meeting", toolVersion: "1", provider: "openai", arguments: {}, status: "pending" };

      const response = await PATCH(patchRequest({ status: "approved" }), { params: Promise.resolve({ id: "approval-1" }) });
      const body = await response.json() as { alreadyDecided?: boolean };

      expect(response.status).toBe(409);
      expect(body.alreadyDecided).toBe(true);
      expect(state.reserveCalls).toHaveLength(0);
    });
  });
});
