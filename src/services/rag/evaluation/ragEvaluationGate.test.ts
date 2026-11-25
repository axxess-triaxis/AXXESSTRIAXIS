import { describe, expect, it } from "vitest";
import { evaluateRagReleaseGate, isRagEvaluationObservation, ragEvaluationFixtures } from "./ragEvaluation";

const complete = [
  { fixtureId: "oxygen-risk-citation", sourceIds: ["demo-risk-register"], confidence: 0.74 },
  { fixtureId: "restricted-human-review", sourceIds: [], confidence: 0.74, humanReviewRequired: true },
];

describe("RAG release gate", () => {
  it("passes when every supplied observation meets its confidence and source expectations", () => {
    const result = evaluateRagReleaseGate(ragEvaluationFixtures, complete);
    expect(result.status).toBe("passed");
    expect(result.failedFixtures).toBe(0);
  });

  it("fails when unauthorized sources are retrieved", () => {
    const result = evaluateRagReleaseGate(ragEvaluationFixtures, [
      { fixtureId: "oxygen-risk-citation", sourceIds: ["demo-risk-register"], confidence: 0.9, unauthorizedSourceIds: ["other-tenant-document"] },
      complete[1],
    ]);
    expect(result.status).toBe("failed");
  });

  it("fails every fixture when nothing was observed", () => {
    const result = evaluateRagReleaseGate(ragEvaluationFixtures, []);
    expect(result.status).toBe("failed");
    expect(result.failedFixtures).toBe(ragEvaluationFixtures.length);
    expect(result.passedFixtures).toBe(0);
  });

  it("fails a fixture without an observation even when it expects no source", () => {
    const result = evaluateRagReleaseGate(ragEvaluationFixtures, [complete[0]]);
    expect(result.findings.find((finding) => finding.fixtureId === "restricted-human-review")?.status).toBe("failed");
    expect(result.status).toBe("failed");
  });
});

describe("isRagEvaluationObservation", () => {
  it.each([
    [null],
    ["passed"],
    [{ fixtureId: "a" }],
    [{ fixtureId: "a", sourceIds: [1], confidence: 1 }],
    [{ fixtureId: "a", sourceIds: [], confidence: "high" }],
    [{ fixtureId: "a", sourceIds: [], confidence: 1, humanReviewRequired: "yes" }],
  ])("rejects %j", (value) => {
    expect(isRagEvaluationObservation(value)).toBe(false);
  });

  it("accepts complete observations", () => {
    expect(complete.every(isRagEvaluationObservation)).toBe(true);
  });
});
