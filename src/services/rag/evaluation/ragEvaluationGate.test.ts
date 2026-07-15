import { describe, expect, it } from "vitest";
import { buildPassingRagReleaseGateObservations, evaluateRagReleaseGate, ragEvaluationFixtures } from "./ragEvaluation";

describe("RAG release gate", () => {
  it("passes when all fixture observations meet confidence and source expectations", () => {
    const result = evaluateRagReleaseGate(ragEvaluationFixtures, buildPassingRagReleaseGateObservations());
    expect(result.status).toBe("passed");
    expect(result.failedFixtures).toBe(0);
  });

  it("fails when unauthorized sources are retrieved", () => {
    const result = evaluateRagReleaseGate(ragEvaluationFixtures, [{
      fixtureId: "oxygen-risk-citation",
      sourceIds: ["demo-risk-register"],
      confidence: 0.9,
      unauthorizedSourceIds: ["other-tenant-document"],
    }]);
    expect(result.status).toBe("failed");
  });
});
