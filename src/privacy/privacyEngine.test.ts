import { describe, expect, it } from "vitest";
import { buildPrivacyExecutionPlan, maskPii, shouldCascadePrivacyAction, tokenizePersonalValue } from "./privacyEngine";

describe("privacy engine", () => {
  it("masks and tokenizes personal data deterministically", () => {
    expect(maskPii("Contact ananya@nehm.example or +91 98765 43210")).toBe("Contact [redacted] or [redacted]");
    expect(tokenizePersonalValue("ananya@nehm.example", "org_ne_hm")).toBe(tokenizePersonalValue("ananya@nehm.example", "org_ne_hm"));
  });

  it("builds cascading erasure plans across data stores", () => {
    const request = {
      id: "privacy_1",
      organizationId: "org_ne_hm",
      requesterUserId: "user_admin",
      subjectUserId: "user_subject",
      type: "erasure" as const,
      status: "approved" as const,
      requestedAt: "2026-07-09T08:00:00.000Z",
    };

    expect(shouldCascadePrivacyAction(request)).toBe(true);
    expect(buildPrivacyExecutionPlan(request).map((step) => step.target)).toEqual([
      "database",
      "storage",
      "vector_index",
      "cache",
      "search_index",
      "analytics",
    ]);
  });
});
