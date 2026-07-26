import type { RagCitation } from "./governedRag";

// RAG Remediation Sprint 2 (A-56): confidence was previously a bare number with no visible
// explanation of what it measured or how it was computed -- founder's own words, "that '72%
// confidence' logic should not be 'black box'." This module is the single source of truth for
// both computing a confidence value and explaining it, so the two can never drift apart.

// Neither RAG path in this codebase (governedRag.ts's in-memory path, tenantRagWorkflow.ts's
// persistent path) calls a real external language model -- src/services/ai/providers/index.ts's
// remotePlaceholderProvider is an explicit stub ("Live completion calls remain provider-gated
// until production credentials... are enabled"). Every answer today is a deterministic local
// extractive summary of retrieved chunk text, not a generative model's output. Claiming
// near-certain confidence for that would misrepresent what the system actually did, so local
// synthesis mode is capped below what a genuinely model-verified answer could show.
export const LOCAL_SYNTHESIS_CONFIDENCE_CEILING = 0.85;
const WEAK_CITATION_SCORE_THRESHOLD = 0.3;

export type RagAnswerMode = "local_extractive_summary" | "no_authorized_source";

export type RagSourceAuthorizationStatus = "fully_authorized" | "restricted_source";

export type RagConfidenceExplanation = {
  /** Best (highest) citation match score among the sources used, 0 if no source matched. */
  sourceMatchStrength: number;
  /** Count of citations backing the answer. */
  relevantChunkCount: number;
  sourceAuthorizationStatus: RagSourceAuthorizationStatus;
  /** Fraction of the answer's sources that met the weak-citation threshold. */
  citationCoverage: number;
  /** Whether this answer came from a real model or the local deterministic fallback. */
  answerMode: RagAnswerMode;
  humanReviewRequired: boolean;
  /** Present and non-empty only when the ceiling below actually reduced the raw confidence. */
  cappedReason?: string;
};

export function buildConfidenceExplanation(input: {
  citations: RagCitation[];
  rawConfidence: number;
  humanReviewRequired: boolean;
  hasRestrictedSource: boolean;
}): { confidence: number; explanation: RagConfidenceExplanation } {
  const { citations, rawConfidence, humanReviewRequired, hasRestrictedSource } = input;

  if (citations.length === 0) {
    return {
      confidence: 0,
      explanation: {
        sourceMatchStrength: 0,
        relevantChunkCount: 0,
        sourceAuthorizationStatus: "fully_authorized",
        citationCoverage: 0,
        answerMode: "no_authorized_source",
        humanReviewRequired,
      },
    };
  }

  const sourceMatchStrength = Math.max(...citations.map((citation) => citation.score));
  const strongCitations = citations.filter((citation) => citation.score >= WEAK_CITATION_SCORE_THRESHOLD).length;
  const citationCoverage = strongCitations / citations.length;

  const cappedConfidence = Math.min(rawConfidence, LOCAL_SYNTHESIS_CONFIDENCE_CEILING);
  const cappedReason = cappedConfidence < rawConfidence
    ? "Capped: no external model provider is configured, so this answer is a deterministic local synthesis, not a model-verified result."
    : undefined;

  return {
    confidence: cappedConfidence,
    explanation: {
      sourceMatchStrength,
      relevantChunkCount: citations.length,
      sourceAuthorizationStatus: hasRestrictedSource ? "restricted_source" : "fully_authorized",
      citationCoverage,
      answerMode: "local_extractive_summary",
      humanReviewRequired,
      cappedReason,
    },
  };
}

/** One-line, human-readable summary of a confidence explanation for compact UI display. */
export function summarizeConfidenceExplanation(explanation: RagConfidenceExplanation): string {
  if (explanation.answerMode === "no_authorized_source") {
    return "No authorized source matched -- confidence reflects a genuine no-match, not an error.";
  }
  const parts = [
    `${explanation.relevantChunkCount} source${explanation.relevantChunkCount === 1 ? "" : "s"}`,
    `${Math.round(explanation.sourceMatchStrength * 100)}% top match strength`,
    explanation.sourceAuthorizationStatus === "restricted_source" ? "includes a restricted source" : "fully authorized sources",
    "local deterministic synthesis (no external model provider configured)",
  ];
  return parts.join(", ") + (explanation.cappedReason ? ` -- ${explanation.cappedReason}` : "");
}
