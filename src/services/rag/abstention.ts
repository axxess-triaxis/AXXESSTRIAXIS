import type { RetrievalEvidence } from "./retrievalEvidence";

export type EvidenceDecision = "answer" | "review" | "abstain";

// gte-small scores unrelated text 0.76 to 0.85 and correct text from 0.78, so similarity alone cannot decide.
// Abstaining needs both signals to be weak: nothing close in meaning, and few of the question's words present.
// Chosen on golden set v1 (CI run 45545952361): at these limits 5 of 16 no-answer questions abstain and 14 of
// 16 abstain or are flagged; 0 of 74 correctly answered questions abstain and 2 are flagged. Both limits are
// tied to gte-small and to English full text: re-measure them if either changes.
const ABSTAIN = { similarity: 0.785, coverage: 0.2 };
const REVIEW = { similarity: 0.82, coverage: 0.25 };

function weak(evidence: { topSimilarity: number; topCoverage: number }, limit: { similarity: number; coverage: number }) {
  return evidence.topSimilarity < limit.similarity && evidence.topCoverage < limit.coverage;
}

/** A signal that was not measured is never treated as weak: without both, the answer is unchanged. */
export function evidenceDecision({ topSimilarity, topCoverage }: RetrievalEvidence): EvidenceDecision {
  if (topSimilarity === undefined || topCoverage === undefined) return "answer";
  const signals = { topSimilarity, topCoverage };
  if (weak(signals, ABSTAIN)) return "abstain";
  return weak(signals, REVIEW) ? "review" : "answer";
}
