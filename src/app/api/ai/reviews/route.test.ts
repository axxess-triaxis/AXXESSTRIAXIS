import { afterEach, describe, expect, it, vi } from "vitest";

// Sprint 5, Priority 2: GET/POST /api/ai/reviews previously had zero role/ownership filtering --
// any authenticated tenant member could see and decide every AI review in the organization.
// Isolated into its own file (rather than extending reviewInbox.test.ts) because it needs
// getServerAuthSession and the repository layer mocked; vi.mock is file-scoped in Vitest.
const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string }; accessToken?: string },
  reviews: [] as Array<{ id: string; organizationId: string; createdByUserId?: string; reviewerUserId?: string }>,
};

vi.mock("../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

const recordedDecisions: Array<Record<string, unknown>> = [];
vi.mock("../../../../services/ai/reviewInbox", async () => {
  const actual = await vi.importActual<typeof import("../../../../services/ai/reviewInbox")>("../../../../services/ai/reviewInbox");
  return {
    ...actual,
    listAiReviewInbox: async () => state.reviews,
    getAiReviewById: async (_organizationId: string, reviewId: string) => state.reviews.find((review) => review.id === reviewId),
    recordAiReviewDecision: async (input: Record<string, unknown> & { reviewId: string; decision: string }) => {
      recordedDecisions.push(input);
      return {
        id: input.reviewId,
        organizationId: "org-1",
        status: input.decision,
        reviewedAt: "2026-07-24T00:00:00.000Z",
        editedAnswer: input.editedAnswer,
        escalationType: input.escalationType,
        escalationTarget: input.escalationTarget,
      };
    },
  };
});

const recordedAudits: Array<{ action: string; resourceId?: string }> = [];
vi.mock("../../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
  auditLogsRepository: {
    record: async (_scope: unknown, input: { action: string; resourceId?: string }) => {
      recordedAudits.push({ action: input.action, resourceId: input.resourceId });
      return { id: "audit-1" };
    },
  },
  meetingsRepository: {},
  notificationsRepository: {},
  projectsRepository: {},
  tasksRepository: {},
}));

const recordedStakeholderNotes: Array<Record<string, unknown>> = [];
vi.mock("../../../../repositories/workflowActionRepositories", () => ({
  approvalRequestsRepository: {},
  projectUpdatesRepository: {},
  stakeholderNotesRepository: {
    create: async (_scope: unknown, input: Record<string, unknown>) => {
      recordedStakeholderNotes.push(input);
      return { id: "note-1", ...input };
    },
  },
}));

vi.mock("../../../../services/workflows/liveTenantWorkflow", () => ({
  createWorkflowActionFromAiReview: async () => ({ id: "action-1" }),
}));

import { GET, POST } from "./route";

function user(id: string, role: string) {
  return { id, organizationId: "org-1", role, accessToken: "token" };
}

describe("GET/POST /api/ai/reviews (Sprint 5 role/ownership fix)", () => {
  afterEach(() => {
    state.session = null;
    state.reviews = [];
    recordedAudits.length = 0;
    recordedDecisions.length = 0;
    recordedStakeholderNotes.length = 0;
    vi.clearAllMocks();
  });

  it("GET returns only reviews the caller created, is assigned to, or is an admin for", async () => {
    state.session = { user: user("user-employee", "Employee") };
    state.reviews = [
      { id: "review-mine", organizationId: "org-1", createdByUserId: "user-employee" },
      { id: "review-assigned-to-me", organizationId: "org-1", reviewerUserId: "user-employee" },
      { id: "review-someone-elses", organizationId: "org-1", createdByUserId: "user-other", reviewerUserId: "user-other" },
    ];

    const response = await GET();
    const body = await response.json() as { reviews: Array<{ id: string }> };

    expect(body.reviews.map((review) => review.id).sort()).toEqual(["review-assigned-to-me", "review-mine"]);
  });

  it("GET returns every review in the tenant for Super Admin and Organization Admin", async () => {
    state.session = { user: user("user-admin", "Organization Admin") };
    state.reviews = [
      { id: "review-a", organizationId: "org-1", createdByUserId: "user-other" },
      { id: "review-b", organizationId: "org-1", createdByUserId: "user-another" },
    ];

    const response = await GET();
    const body = await response.json() as { reviews: Array<{ id: string }> };

    expect(body.reviews).toHaveLength(2);
  });

  it("GET returns 401 for an unauthenticated request", async () => {
    state.session = null;
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("POST denies deciding a review not assigned to the caller, with a safe (non-raw) error message", async () => {
    state.session = { user: user("user-employee", "Employee") };
    state.reviews = [{ id: "review-1", organizationId: "org-1", createdByUserId: "user-other", reviewerUserId: "user-other" }];

    const response = await POST(new Request("http://localhost/api/ai/reviews", {
      method: "POST",
      body: JSON.stringify({ reviewId: "review-1", decision: "approved" }),
    }));
    const body = await response.json() as { error?: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("This review is not assigned to you.");
    expect(body.error).not.toMatch(/unauthorized/i);
  });

  it("POST records an audit event for a denied decision attempt", async () => {
    state.session = { user: user("user-employee", "Employee") };
    state.reviews = [{ id: "review-1", organizationId: "org-1", reviewerUserId: "user-other" }];

    await POST(new Request("http://localhost/api/ai/reviews", {
      method: "POST",
      body: JSON.stringify({ reviewId: "review-1", decision: "approved" }),
    }));

    expect(recordedAudits).toContainEqual({ action: "ai.review.decision_denied", resourceId: "review-1" });
  });

  it("POST allows the assigned reviewer to decide their own review", async () => {
    state.session = { user: user("user-reviewer", "Employee") };
    state.reviews = [{ id: "review-1", organizationId: "org-1", reviewerUserId: "user-reviewer" }];

    const response = await POST(new Request("http://localhost/api/ai/reviews", {
      method: "POST",
      body: JSON.stringify({ reviewId: "review-1", decision: "approved" }),
    }));

    expect(response.status).toBe(200);
  });

  it("POST denies the review's own creator from self-approving when they are not the assigned reviewer", async () => {
    state.session = { user: user("user-creator", "Employee") };
    state.reviews = [{ id: "review-1", organizationId: "org-1", createdByUserId: "user-creator" }];

    const response = await POST(new Request("http://localhost/api/ai/reviews", {
      method: "POST",
      body: JSON.stringify({ reviewId: "review-1", decision: "approved" }),
    }));

    expect(response.status).toBe(403);
  });

  it("POST allows Organization Admin to decide any review, including one with no reviewer assigned yet", async () => {
    state.session = { user: user("user-admin", "Organization Admin") };
    state.reviews = [{ id: "review-1", organizationId: "org-1" }];

    const response = await POST(new Request("http://localhost/api/ai/reviews", {
      method: "POST",
      body: JSON.stringify({ reviewId: "review-1", decision: "approved" }),
    }));

    expect(response.status).toBe(200);
  });

  it("POST denies deciding a review id that does not exist, without revealing whether it exists in another tenant", async () => {
    state.session = { user: user("user-employee", "Employee") };
    state.reviews = [];

    const response = await POST(new Request("http://localhost/api/ai/reviews", {
      method: "POST",
      body: JSON.stringify({ reviewId: "review-does-not-exist", decision: "approved" }),
    }));
    const body = await response.json() as { error?: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("This review is not assigned to you.");
  });

  // A-102 (2026-08-09): "Mark edited"/"Escalate" now require real substance, not just a decision label.
  describe("A-102 -- edited/escalation substance", () => {
    it("POST 400s when decision is 'edited' with no editedAnswer", async () => {
      state.session = { user: user("user-reviewer", "Employee") };
      state.reviews = [{ id: "review-1", organizationId: "org-1", reviewerUserId: "user-reviewer" }];

      const response = await POST(new Request("http://localhost/api/ai/reviews", {
        method: "POST",
        body: JSON.stringify({ reviewId: "review-1", decision: "edited" }),
      }));
      const body = await response.json() as { error?: string };

      expect(response.status).toBe(400);
      expect(body.error).toBe("Edited answer text is required.");
    });

    it("POST succeeds when decision is 'edited' with real editedAnswer text", async () => {
      state.session = { user: user("user-reviewer", "Employee") };
      state.reviews = [{ id: "review-1", organizationId: "org-1", reviewerUserId: "user-reviewer" }];

      const response = await POST(new Request("http://localhost/api/ai/reviews", {
        method: "POST",
        body: JSON.stringify({ reviewId: "review-1", decision: "edited", editedAnswer: "The corrected text." }),
      }));

      expect(response.status).toBe(200);
      expect(recordedDecisions.at(-1)?.editedAnswer).toBe("The corrected text.");
    });

    it("POST 400s when decision is 'escalated' with no escalationType", async () => {
      state.session = { user: user("user-reviewer", "Employee") };
      state.reviews = [{ id: "review-1", organizationId: "org-1", reviewerUserId: "user-reviewer" }];

      const response = await POST(new Request("http://localhost/api/ai/reviews", {
        method: "POST",
        body: JSON.stringify({ reviewId: "review-1", decision: "escalated" }),
      }));
      const body = await response.json() as { error?: string };

      expect(response.status).toBe(400);
      expect(body.error).toBe("An escalation target is required.");
    });

    it("POST 400s when escalationType is 'mapped_stakeholder' but no stakeholderId is given", async () => {
      state.session = { user: user("user-reviewer", "Employee") };
      state.reviews = [{ id: "review-1", organizationId: "org-1", reviewerUserId: "user-reviewer" }];

      const response = await POST(new Request("http://localhost/api/ai/reviews", {
        method: "POST",
        body: JSON.stringify({ reviewId: "review-1", decision: "escalated", escalationType: "mapped_stakeholder", escalationTarget: {} }),
      }));

      expect(response.status).toBe(400);
    });

    it("POST 400s when escalationType is 'internal_unmapped' with neither email nor employeeCode", async () => {
      state.session = { user: user("user-reviewer", "Employee") };
      state.reviews = [{ id: "review-1", organizationId: "org-1", reviewerUserId: "user-reviewer" }];

      const response = await POST(new Request("http://localhost/api/ai/reviews", {
        method: "POST",
        body: JSON.stringify({ reviewId: "review-1", decision: "escalated", escalationType: "internal_unmapped", escalationTarget: { name: "Someone" } }),
      }));

      expect(response.status).toBe(400);
    });

    it("POST succeeds and forwards escalation fields for a valid external_email escalation", async () => {
      state.session = { user: user("user-reviewer", "Employee") };
      state.reviews = [{ id: "review-1", organizationId: "org-1", reviewerUserId: "user-reviewer" }];

      const response = await POST(new Request("http://localhost/api/ai/reviews", {
        method: "POST",
        body: JSON.stringify({ reviewId: "review-1", decision: "escalated", escalationType: "external_email", escalationTarget: { email: "external@example.com" } }),
      }));

      expect(response.status).toBe(200);
      expect(recordedDecisions.at(-1)?.escalationType).toBe("external_email");
      expect(recordedDecisions.at(-1)?.escalationTarget).toEqual({ email: "external@example.com" });
    });

    it("POST calls stakeholderNotesRepository.create for a mapped_stakeholder escalation", async () => {
      state.session = { user: user("user-reviewer", "Employee") };
      state.reviews = [{ id: "review-1", organizationId: "org-1", reviewerUserId: "user-reviewer", answerExcerpt: "Oxygen resilience summary." }];

      const response = await POST(new Request("http://localhost/api/ai/reviews", {
        method: "POST",
        body: JSON.stringify({
          reviewId: "review-1",
          decision: "escalated",
          escalationType: "mapped_stakeholder",
          escalationTarget: { stakeholderId: "stakeholder-1", stakeholderName: "District Coordinator" },
        }),
      }));

      expect(response.status).toBe(200);
      expect(recordedStakeholderNotes).toHaveLength(1);
      expect(recordedStakeholderNotes[0].stakeholderId).toBe("stakeholder-1");
      expect(recordedStakeholderNotes[0].sourceAiReviewId).toBe("review-1");
    });

    it("POST does not call stakeholderNotesRepository.create for a non-mapped-stakeholder escalation", async () => {
      state.session = { user: user("user-reviewer", "Employee") };
      state.reviews = [{ id: "review-1", organizationId: "org-1", reviewerUserId: "user-reviewer" }];

      await POST(new Request("http://localhost/api/ai/reviews", {
        method: "POST",
        body: JSON.stringify({ reviewId: "review-1", decision: "escalated", escalationType: "external_email", escalationTarget: { email: "external@example.com" } }),
      }));

      expect(recordedStakeholderNotes).toHaveLength(0);
    });
  });
});
