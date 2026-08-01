import { beforeEach, describe, expect, it } from "vitest";
import { canDecideAiReview, canViewAiReview, fallbackAiReviewInbox, listAiReviewInbox, recordAiReviewDecision, toInboxItem, type AiReviewRow } from "./reviewInbox";

describe("AI review inbox", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("provides tenant-bound fallback review items", () => {
    const reviews = fallbackAiReviewInbox("org-1");
    expect(reviews.length).toBeGreaterThan(0);
    expect(reviews.every((review) => review.organizationId === "org-1")).toBe(true);
    expect(reviews.some((review) => review.humanReviewFlag)).toBe(true);
  });

  // Investor Demo enterprise-scale dataset pass (2026-07-24): the AI Review Inbox previously
  // fell back to 2 hardcoded items, far short of a mature-institution feel for investor demos.
  it("provides an enterprise-scale (100+) deterministic fallback queue with unique ids and a mix of statuses", () => {
    const reviews = fallbackAiReviewInbox("org-1");
    expect(reviews.length).toBeGreaterThanOrEqual(100);
    expect(new Set(reviews.map((review) => review.id)).size).toBe(reviews.length);
    const statuses = new Set(reviews.map((review) => review.status));
    expect(statuses.size).toBeGreaterThan(1);
    // Deterministic: calling twice produces the identical dataset (no randomness).
    expect(fallbackAiReviewInbox("org-1")).toEqual(reviews);
  });

  it("shows a real tenant an empty inbox instead of fabricated reviews when Supabase isn't configured and demo mode is off", async () => {
    const reviews = await listAiReviewInbox("org-1");
    expect(reviews).toEqual([]);
  });

  it("records review decisions without requiring Supabase in local mode", async () => {
    const result = await recordAiReviewDecision({
      organizationId: "org-1",
      reviewId: "review-1",
      reviewerUserId: "user-1",
      decision: "approved",
      decisionReason: "Source packet verified.",
    });

    expect(result.status).toBe("approved");
    expect(result.reviewedAt).toBeTruthy();
  });

  // Sprint 5: GET /api/ai/reviews previously returned every review in the tenant to any
  // authenticated member. These mirror ai_operation_reviews' own RLS policies exactly
  // (supabase/migrations/202607150001_sprint22_23_pilot_command_center.sql) at the application
  // layer, since this service reads via the service-role client and RLS never applies.
  describe("canViewAiReview (mirrors ai_operation_reviews_member_select RLS)", () => {
    it("lets the review's creator view it", () => {
      expect(canViewAiReview({ createdByUserId: "user-1", reviewerUserId: undefined }, "user-1", "Employee")).toBe(true);
    });

    it("lets the assigned reviewer view it", () => {
      expect(canViewAiReview({ createdByUserId: "user-1", reviewerUserId: "user-2" }, "user-2", "Employee")).toBe(true);
    });

    it("lets Super Admin and Organization Admin view any review in the tenant", () => {
      expect(canViewAiReview({ createdByUserId: "user-1", reviewerUserId: undefined }, "user-99", "Super Admin")).toBe(true);
      expect(canViewAiReview({ createdByUserId: "user-1", reviewerUserId: undefined }, "user-99", "Organization Admin")).toBe(true);
    });

    it("denies an unrelated Employee or Guest", () => {
      expect(canViewAiReview({ createdByUserId: "user-1", reviewerUserId: "user-2" }, "user-3", "Employee")).toBe(false);
      expect(canViewAiReview({ createdByUserId: "user-1", reviewerUserId: "user-2" }, "user-3", "Guest")).toBe(false);
    });
  });

  // RAG Remediation Sprint 2 (A-63): question/fullAnswer/confidenceExplanation are read out of
  // ai_operation_reviews.metadata, not dedicated columns -- this covers that mapping directly.
  describe("toInboxItem (RAG Remediation Sprint 2, A-63 metadata mapping)", () => {
    function row(overrides: Partial<AiReviewRow> = {}): AiReviewRow {
      return {
        id: "review-1",
        organization_id: "org-1",
        created_by_user_id: "user-1",
        reviewer_user_id: null,
        source_audit_id: "audit-1",
        task_category: "governed_rag_answer",
        status: "pending",
        confidence: "0.81",
        human_review_flag: true,
        answer_excerpt: "Oxygen resilience summary.",
        citations: [],
        metadata: null,
        created_at: "2026-07-26T00:00:00.000Z",
        reviewed_at: null,
        decision_reason: null,
        ...overrides,
      };
    }

    it("surfaces question, fullAnswer, and confidenceExplanation when present in metadata", () => {
      const item = toInboxItem(row({
        metadata: {
          question: "What is the oxygen resilience risk?",
          fullAnswer: "The full, non-excerpted answer text.",
          confidenceExplanation: {
            sourceMatchStrength: 0.8,
            relevantChunkCount: 2,
            sourceAuthorizationStatus: "fully_authorized",
            citationCoverage: 1,
            answerMode: "local_extractive_summary",
            humanReviewRequired: true,
          },
        },
      }));

      expect(item.question).toBe("What is the oxygen resilience risk?");
      expect(item.fullAnswer).toBe("The full, non-excerpted answer text.");
      expect(item.confidenceExplanation?.answerMode).toBe("local_extractive_summary");
    });

    it("leaves question/fullAnswer/confidenceExplanation undefined for older rows with no metadata", () => {
      const item = toInboxItem(row({ metadata: null }));

      expect(item.question).toBeUndefined();
      expect(item.fullAnswer).toBeUndefined();
      expect(item.confidenceExplanation).toBeUndefined();
      // The review is still usable -- answerExcerpt/citations remain the fallback, not an error.
      expect(item.answerExcerpt).toBe("Oxygen resilience summary.");
    });
  });

  describe("canDecideAiReview (mirrors ai_operation_reviews_reviewer_update RLS)", () => {
    it("lets the assigned reviewer decide it", () => {
      expect(canDecideAiReview({ reviewerUserId: "user-2" }, "user-2", "Employee")).toBe(true);
    });

    it("lets Super Admin and Organization Admin decide any review, even unassigned", () => {
      expect(canDecideAiReview({ reviewerUserId: undefined }, "user-99", "Super Admin")).toBe(true);
      expect(canDecideAiReview({ reviewerUserId: undefined }, "user-99", "Organization Admin")).toBe(true);
    });

    it("denies the review's own creator when they are not the assigned reviewer and not an admin", () => {
      // Deliberately stricter than canViewAiReview: creating a review (e.g. asking the question
      // that generated it) is not sufficient to self-approve it without oversight -- matches the
      // RLS update policy, which never checks created_by_user_id.
      expect(canDecideAiReview({ reviewerUserId: undefined }, "user-1", "Employee")).toBe(false);
    });

    it("denies an unassigned non-admin entirely, including for a review with no reviewer yet", () => {
      expect(canDecideAiReview({ reviewerUserId: undefined }, "user-3", "Manager")).toBe(false);
      expect(canDecideAiReview({ reviewerUserId: "user-2" }, "user-3", "Manager")).toBe(false);
    });
  });
});
