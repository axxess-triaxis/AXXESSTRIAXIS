import { describe, expect, it } from "vitest";
import { resolveComplianceDecision } from "./complianceEngine";

describe("compliance engine", () => {
  it("selects jurisdiction controls and flags human review for high-impact AI", () => {
    const decision = resolveComplianceDecision({
      jurisdictions: ["EU_GDPR", "EU_AI_ACT", "INDIA_DPDP"],
      dataClassifications: ["personal", "restricted"],
      highImpactAiUse: true,
    });

    expect(decision.controls.map((control) => control.id)).toContain("gdpr-data-subject-rights");
    expect(decision.controls.map((control) => control.id)).toContain("eu-ai-human-oversight");
    expect(decision.controls.map((control) => control.id)).toContain("india-dpdp-consent-retention");
    expect(decision.humanReviewRequired).toBe(true);
    expect(decision.dataResidencyRequired).toBe(true);
  });
});
