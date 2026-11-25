import { describe, expect, it } from "vitest";
import { evidenceDecision } from "./abstention";

describe("abstention", () => {
  it.each([
    ["both signals weak", 0.77, 0.1, "abstain"],
    ["low similarity but the words are there", 0.77, 0.9, "answer"],
    ["low similarity and some words", 0.77, 0.22, "review"],
    ["a paraphrase: close in meaning, no shared word", 0.86, 0, "answer"],
    ["middling similarity, no shared word", 0.8, 0, "review"],
  ])("%s", (_label, topSimilarity, topCoverage, expected) => {
    expect(evidenceDecision({ topSimilarity, topCoverage, candidates: 5 })).toBe(expected);
  });

  it("never abstains on one signal alone", () => {
    expect(evidenceDecision({ topSimilarity: 0.1, candidates: 5 })).toBe("answer");
    expect(evidenceDecision({ topCoverage: 0, candidates: 5 })).toBe("answer");
  });
});
