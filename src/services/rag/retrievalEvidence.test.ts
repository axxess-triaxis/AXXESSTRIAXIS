import { describe, expect, it } from "vitest";
import { fullTextEvidence, semanticEvidence } from "./retrievalEvidence";

describe("retrieval evidence", () => {
  it("describes the best hit against the others, and word coverage", () => {
    const evidence = semanticEvidence(
      [{ id: "a", similarity: 0.9 }, { id: "b", similarity: 0.8 }, { id: "c", similarity: 0.7 }],
      [{ id: "b", coverage: 0.6 }, { id: "a", coverage: 0.2 }],
    );
    expect(evidence.topSimilarity).toBe(0.9);
    expect(evidence.restMean).toBeCloseTo(0.75, 10);
    expect(evidence.restDeviation).toBeCloseTo(0.05, 10);
    expect(evidence).toMatchObject({ candidates: 3, topCoverage: 0.6, semanticTopCoverage: 0.2 });
  });

  it("leaves out what was not measured instead of reporting zero", () => {
    expect(semanticEvidence([{ id: "a", similarity: 0.9 }], null)).toEqual({ topSimilarity: 0.9, restMean: undefined, restDeviation: undefined, candidates: 1 });
    expect(fullTextEvidence(null)).toEqual({});
    expect(fullTextEvidence([])).toEqual({ topCoverage: 0 });
  });
});
