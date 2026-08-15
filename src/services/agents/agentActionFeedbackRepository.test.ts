import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  calls: [] as Array<{ table: string; options: Record<string, unknown> }>,
  responses: [] as unknown[],
};

vi.mock("../../repositories/supabaseAdmin", () => ({
  supabaseAdminRest: async (table: string, options: Record<string, unknown>) => {
    state.calls.push({ table, options });
    return state.responses.shift();
  },
}));

import { createAgentActionFeedback, listAgentActionFeedback } from "./agentActionFeedbackRepository";

function feedbackRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "feedback-1",
    organization_id: "org-1",
    audit_log_id: "audit-1",
    agent_connection_id: "conn-1",
    tool_name: "create_task",
    provider: "openai",
    rating: 4,
    flagged: false,
    flag_reason: null,
    submitted_by_user_id: "user-1",
    created_at: "2026-08-14T00:00:00.000Z",
    ...overrides,
  };
}

describe("agentActionFeedbackRepository", () => {
  afterEach(() => {
    state.calls = [];
    state.responses = [];
    vi.clearAllMocks();
  });

  it("creates feedback scoped to the given organization and audit log", async () => {
    state.responses = [[feedbackRow()]];

    const feedback = await createAgentActionFeedback({
      organizationId: "org-1",
      auditLogId: "audit-1",
      agentConnectionId: "conn-1",
      toolName: "create_task",
      provider: "openai",
      rating: 4,
      submittedByUserId: "user-1",
    });

    const body = state.calls[0].options.body as Record<string, unknown>;
    expect(body.organization_id).toBe("org-1");
    expect(body.audit_log_id).toBe("audit-1");
    expect(body.rating).toBe(4);
    expect(body.flagged).toBe(false);
    expect(feedback.id).toBe("feedback-1");
    expect(feedback.rating).toBe(4);
  });

  it("creates a flagged entry with a reason, independent of rating", async () => {
    state.responses = [[feedbackRow({ rating: null, flagged: true, flag_reason: "Wrong recipient." })]];

    const feedback = await createAgentActionFeedback({
      organizationId: "org-1",
      auditLogId: "audit-1",
      toolName: "add_stakeholder_note",
      provider: "anthropic",
      flagged: true,
      flagReason: "Wrong recipient.",
    });

    const body = state.calls[0].options.body as Record<string, unknown>;
    expect(body.flagged).toBe(true);
    expect(body.flag_reason).toBe("Wrong recipient.");
    expect(body.rating).toBeNull();
    expect(feedback.rating).toBeUndefined();
    expect(feedback.flagged).toBe(true);
  });

  it("lists feedback scoped to the given organization", async () => {
    state.responses = [[feedbackRow(), feedbackRow({ id: "feedback-2" })]];
    const feedback = await listAgentActionFeedback("org-1");

    expect(feedback).toHaveLength(2);
    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("organization_id")).toBe("eq.org-1");
    expect(query.has("flagged")).toBe(false);
  });

  it("filters to flagged-only when requested", async () => {
    state.responses = [[feedbackRow({ flagged: true })]];
    await listAgentActionFeedback("org-1", { flaggedOnly: true });

    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("flagged")).toBe("eq.true");
  });
});
