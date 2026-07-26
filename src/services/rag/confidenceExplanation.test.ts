import { describe, expect, it } from "vitest";
import { buildConfidenceExplanation, LOCAL_SYNTHESIS_CONFIDENCE_CEILING, summarizeConfidenceExplanation } from "./confidenceExplanation";
import type { RagCitation } from "./governedRag";

function citation(input: Partial<RagCitation> & { score: number }): RagCitation {
  return {
    sourceType: "document",
    sourceId: "doc-1",
    title: "Oxygen Resilience Risk Register",
    excerpt: "Mitigation owner required.",
    ...input,
  };
}

// RAG Remediation Sprint 2 (A-56): confidence must stop being a black box -- these tests cover
// the explanation object's own claims (what it says the score measures) as well as the actual
// capping behavior (whether the score really is capped when the sprint says it should be).
describe("buildConfidenceExplanation", () => {
  it("gives a strong-match answer a full explanation naming source strength, chunk count, and mode", () => {
    const { confidence, explanation } = buildConfidenceExplanation({
      citations: [citation({ score: 0.9 }), citation({ score: 0.7, sourceId: "doc-2" })],
      rawConfidence: 0.93,
      humanReviewRequired: false,
      hasRestrictedSource: false,
    });

    expect(confidence).toBeGreaterThan(0.5);
    expect(explanation.sourceMatchStrength).toBe(0.9);
    expect(explanation.relevantChunkCount).toBe(2);
    expect(explanation.sourceAuthorizationStatus).toBe("fully_authorized");
    expect(explanation.answerMode).toBe("local_extractive_summary");
  });

  it("gives a no-match answer zero confidence and an explanation that says why, not an error", () => {
    const { confidence, explanation } = buildConfidenceExplanation({
      citations: [],
      rawConfidence: 0,
      humanReviewRequired: true,
      hasRestrictedSource: false,
    });

    expect(confidence).toBe(0);
    expect(explanation.answerMode).toBe("no_authorized_source");
    expect(explanation.relevantChunkCount).toBe(0);
    expect(summarizeConfidenceExplanation(explanation)).toMatch(/no authorized source matched/i);
  });

  it("caps confidence at the local-synthesis ceiling and records why, since no real external model provider exists in this codebase", () => {
    const { confidence, explanation } = buildConfidenceExplanation({
      citations: [citation({ score: 0.99 })],
      rawConfidence: 0.99,
      humanReviewRequired: false,
      hasRestrictedSource: false,
    });

    expect(confidence).toBe(LOCAL_SYNTHESIS_CONFIDENCE_CEILING);
    expect(explanation.cappedReason).toBeTruthy();
    expect(explanation.cappedReason).toMatch(/no external model provider/i);
  });

  it("does not report a capped reason when the raw confidence was already below the ceiling", () => {
    const { confidence, explanation } = buildConfidenceExplanation({
      citations: [citation({ score: 0.4 })],
      rawConfidence: 0.5,
      humanReviewRequired: false,
      hasRestrictedSource: false,
    });

    expect(confidence).toBe(0.5);
    expect(explanation.cappedReason).toBeUndefined();
  });

  it("flags restricted-source authorization status distinctly from fully authorized", () => {
    const { explanation } = buildConfidenceExplanation({
      citations: [citation({ score: 0.6 })],
      rawConfidence: 0.6,
      humanReviewRequired: true,
      hasRestrictedSource: true,
    });

    expect(explanation.sourceAuthorizationStatus).toBe("restricted_source");
  });

  it("reports low citation coverage when most citations are weak matches", () => {
    const { explanation } = buildConfidenceExplanation({
      citations: [citation({ score: 0.9 }), citation({ score: 0.05, sourceId: "doc-weak" })],
      rawConfidence: 0.6,
      humanReviewRequired: false,
      hasRestrictedSource: false,
    });

    expect(explanation.citationCoverage).toBe(0.5);
  });
});
