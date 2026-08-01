import { describe, expect, it } from "vitest";
import { computeScore, qualifiesForUrgentAttention, type CriticalityBand, type PriorityLevel1to5 } from "./tileScoring";

const priorities: PriorityLevel1to5[] = [1, 2, 3, 4, 5];
const criticalities: CriticalityBand[] = ["green", "yellow", "orange", "amber", "red"];
const weight: Record<CriticalityBand, number> = { green: 1, yellow: 2, orange: 3, amber: 4, red: 5 };

describe("computeScore", () => {
  it("computes priority x criticality weight for the full 25-cell grid", () => {
    for (const priority of priorities) {
      for (const criticality of criticalities) {
        expect(computeScore(priority, criticality)).toBe(priority * weight[criticality]);
      }
    }
  });

  it("matches the documented grid boundaries", () => {
    expect(computeScore(1, "green")).toBe(1);
    expect(computeScore(5, "red")).toBe(25);
    expect(computeScore(3, "red")).toBe(15);
    expect(computeScore(4, "amber")).toBe(16);
  });
});

describe("qualifiesForUrgentAttention", () => {
  const qualifyingPairs: Array<[PriorityLevel1to5, CriticalityBand]> = [
    [4, "amber"],
    [4, "red"],
    [5, "amber"],
    [5, "red"],
  ];

  it("qualifies exactly the 4 cells with score >= 16", () => {
    for (const priority of priorities) {
      for (const criticality of criticalities) {
        const shouldQualify = qualifyingPairs.some(([p, c]) => p === priority && c === criticality);
        expect(qualifiesForUrgentAttention(priority, criticality)).toBe(shouldQualify);
      }
    }
  });

  it("excludes Priority 3 x Red (score 15) -- the known trap case", () => {
    expect(computeScore(3, "red")).toBe(15);
    expect(qualifiesForUrgentAttention(3, "red")).toBe(false);
  });

  it("includes Priority 4 x Amber (score 16) -- deliberate founder decision, not an oversight", () => {
    expect(computeScore(4, "amber")).toBe(16);
    expect(qualifiesForUrgentAttention(4, "amber")).toBe(true);
  });

  it("qualifies exactly 4 of 25 cells (16% of the grid)", () => {
    let qualifying = 0;
    for (const priority of priorities) {
      for (const criticality of criticalities) {
        if (qualifiesForUrgentAttention(priority, criticality)) qualifying += 1;
      }
    }
    expect(qualifying).toBe(4);
  });
});
