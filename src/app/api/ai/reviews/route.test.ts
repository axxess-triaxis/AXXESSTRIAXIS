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

vi.mock("../../../../services/ai/reviewInbox", async () => {
  const actual = await vi.importActual<typeof import("../../../../services/ai/reviewInbox")>("../../../../services/ai/reviewInbox");
  return {
    ...actual,
    listAiReviewInbox: async () => state.reviews,
    getAiReviewById: async (_organizationId: string, reviewId: string) => state.reviews.find((review) => review.id === reviewId),
    recordAiReviewDecision: async (input: { reviewId: string; decision: string; reviewerUserId: string }) => ({
      id: input.reviewId,
      organizationId: "org-1",
      status: input.decision,
      reviewedAt: "2026-07-24T00:00:00.000Z",
    }),
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

vi.mock("../../../../repositories/workflowActionRepositories", () => ({
  approvalRequestsRepository: {},
  projectUpdatesRepository: {},
  stakeholderNotesRepository: {},
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
});
