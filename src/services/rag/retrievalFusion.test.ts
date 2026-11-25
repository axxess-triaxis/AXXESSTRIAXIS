import { describe, expect, it } from "vitest";
import { displayScores, fuseRanks } from "./retrievalFusion";

const ranked = (order: Map<string, number>) => [...order.entries()].sort((left, right) => right[1] - left[1]).map(([id]) => id);

const semantic = [
  { id: "a", similarity: 0.82 },
  { id: "b", similarity: 0.81 },
  { id: "c", similarity: 0.8 },
  { id: "code", similarity: 0.79 },
];

describe("rank fusion", () => {
  it("keeps the semantic order when full text found nothing", () => {
    expect(ranked(fuseRanks({ semantic, fullText: [] }))).toEqual(["a", "b", "c", "code"]);
  });

  it("lifts a chunk that holds the exact code the question names", () => {
    expect(ranked(fuseRanks({ semantic, fullText: [{ id: "code", coverage: 0.95 }] }))[0]).toBe("code");
  });

  it("ignores full text that covers no more than half of the question, so one shared word cannot move a paraphrase", () => {
    expect(ranked(fuseRanks({ semantic, fullText: [{ id: "code", coverage: 0.5 }, { id: "c", coverage: 0.2 }] }))).toEqual(["a", "b", "c", "code"]);
  });

  it("keeps semantic rank as a vote: equal full-text votes leave the better semantic hit first", () => {
    const fused = fuseRanks({ semantic, fullText: [{ id: "a", coverage: 0.6 }, { id: "code", coverage: 0.6 }] });
    expect(ranked(fused).slice(0, 2)).toEqual(["a", "code"]);
  });

  it("can add a chunk only full text found", () => {
    expect(ranked(fuseRanks({ semantic, fullText: [{ id: "unembedded", coverage: 0.9 }] }))).toContain("unembedded");
  });

  it("shows similarity as the score, and never scores a full-text-only chunk above the weakest semantic hit", () => {
    const scores = displayScores({ semantic, fullText: [{ id: "code", coverage: 1 }, { id: "only", coverage: 1 }, { id: "weak", coverage: 0.6 }] });
    expect(scores.get("code")).toBe(0.79);
    expect(scores.get("only")).toBe(0.79);
    expect(scores.get("weak")).toBe(0.6);
  });
});
