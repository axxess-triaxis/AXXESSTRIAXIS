import { beforeEach, describe, expect, it } from "vitest";
import { fallbackAiReviewInbox, listAiReviewInbox, recordAiReviewDecision } from "./reviewInbox";

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
});
