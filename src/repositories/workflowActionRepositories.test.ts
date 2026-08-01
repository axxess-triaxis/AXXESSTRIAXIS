import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  isConfigured: true,
  calls: [] as Array<{ table: string; options: Record<string, unknown> }>,
  responses: [] as unknown[],
};

vi.mock("./supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => state.isConfigured,
  supabaseAdminRest: async (table: string, options: Record<string, unknown>) => {
    state.calls.push({ table, options });
    return state.responses.shift();
  },
}));

import { approvalRequestsRepository } from "./workflowActionRepositories";

const scope = { organizationId: "org-1", userId: "user-1", role: "Manager" as const };

function approvalRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "approval-1", organization_id: "org-1", requested_by_user_id: "user-1", reviewer_user_id: null,
    source_ai_review_id: null, source_audit_log_id: null, title: "Agent wants to call create_meeting",
    description: null, priority: "high", status: "pending", due_at: null, decision_reason: null,
    metadata: {}, decided_at: null, created_at: "2026-07-30T00:00:00.000Z", updated_at: "2026-07-30T00:00:00.000Z",
    ...overrides,
  };
}

describe("approvalRequestsRepository.decide (Agentic Infrastructure Phase 2, 2026-07-30)", () => {
  afterEach(() => {
    state.calls = [];
    state.responses = [];
    state.isConfigured = true;
    vi.clearAllMocks();
  });

  it("approves, setting status/reviewer_user_id/decided_at, scoped to the caller's organization", async () => {
    state.responses = [[approvalRow({ status: "approved", reviewer_user_id: "user-1", decided_at: "2026-07-30T01:00:00.000Z" })]];

    const decided = await approvalRequestsRepository.decide(scope, "approval-1", { status: "approved" });

    expect(decided.status).toBe("approved");
    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("id")).toBe("eq.approval-1");
    expect(query.get("organization_id")).toBe("eq.org-1");
    const body = state.calls[0].options.body as Record<string, unknown>;
    expect(body.status).toBe("approved");
    expect(body.reviewer_user_id).toBe("user-1");
    expect(body.decided_at).toBeTruthy();
  });

  it("rejects with an optional decision reason", async () => {
    state.responses = [[approvalRow({ status: "rejected", decision_reason: "Not needed right now." })]];

    const decided = await approvalRequestsRepository.decide(scope, "approval-1", { status: "rejected", decisionReason: "Not needed right now." });

    expect(decided.status).toBe("rejected");
    expect(decided.decisionReason).toBe("Not needed right now.");
  });

  it("throws when the approval id doesn't belong to this organization (no row returned)", async () => {
    state.responses = [[]];
    await expect(approvalRequestsRepository.decide(scope, "approval-999", { status: "approved" })).rejects.toThrow();
  });

  it("throws rather than silently no-op when Supabase admin isn't configured", async () => {
    state.isConfigured = false;
    await expect(approvalRequestsRepository.decide(scope, "approval-1", { status: "approved" })).rejects.toThrow();
    expect(state.calls).toHaveLength(0);
  });
});
