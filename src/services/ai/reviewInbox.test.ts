import { describe, expect, it } from "vitest";
import { fallbackAiReviewInbox, recordAiReviewDecision } from "./reviewInbox";

describe("AI review inbox", () => {
  it("provides tenant-bound fallback review items", () => {
    const reviews = fallbackAiReviewInbox("org-1");
    expect(reviews.length).toBeGreaterThan(0);
    expect(reviews.every((review) => review.organizationId === "org-1")).toBe(true);
    expect(reviews.some((review) => review.humanReviewFlag)).toBe(true);
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
});
