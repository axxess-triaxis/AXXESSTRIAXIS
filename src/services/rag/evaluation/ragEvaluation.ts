export type RagEvaluationFixture = {
  id: string;
  question: string;
  expectedSourceIds: string[];
  minimumConfidence: number;
  tenantId: string;
};

export const ragEvaluationFixtures: RagEvaluationFixture[] = [
  {
    id: "oxygen-risk-citation",
    question: "Which oxygen resilience risks require immediate governance review?",
    expectedSourceIds: ["demo-risk-register"],
    minimumConfidence: 0.62,
    tenantId: "north-east-health-mission",
  },
  {
    id: "restricted-human-review",
    question: "Summarize restricted procurement variance evidence.",
    expectedSourceIds: [],
    minimumConfidence: 0.5,
    tenantId: "north-east-health-mission",
  },
];

export type RagEvaluationObservation = {
  fixtureId: string;
  sourceIds: string[];
  confidence: number;
  unauthorizedSourceIds?: string[];
  humanReviewRequired?: boolean;
};

export type RagEvaluationGateResult = {
  status: "passed" | "warning" | "failed";
  fixturesRun: number;
  passedFixtures: number;
  failedFixtures: number;
  minimumConfidence: number;
  findings: Array<{
    fixtureId: string;
    status: "passed" | "warning" | "failed";
    messages: string[];
  }>;
};

export function evaluateRagReleaseGate(
  fixtures: RagEvaluationFixture[] = ragEvaluationFixtures,
  observations: RagEvaluationObservation[] = [],
): RagEvaluationGateResult {
  const observationByFixture = new Map(observations.map((observation) => [observation.fixtureId, observation]));
  const findings = fixtures.map((fixture) => {
    const observation = observationByFixture.get(fixture.id);
    const messages: string[] = [];
    if (!observation) messages.push("Fixture has no observed RAG answer.");
    if (observation && observation.confidence < fixture.minimumConfidence) {
      messages.push(`Confidence ${observation.confidence.toFixed(2)} is below required ${fixture.minimumConfidence.toFixed(2)}.`);
    }
    const missingSources = fixture.expectedSourceIds.filter((sourceId) => !observation?.sourceIds.includes(sourceId));
    if (missingSources.length > 0) messages.push(`Missing expected source(s): ${missingSources.join(", ")}.`);
    if ((observation?.unauthorizedSourceIds ?? []).length > 0) {
      messages.push(`Unauthorized source(s) retrieved: ${observation?.unauthorizedSourceIds?.join(", ")}.`);
    }
    if (fixture.expectedSourceIds.length === 0 && observation && !observation.humanReviewRequired) {
      messages.push("Restricted fixture without expected sources must require human review.");
    }

    const status: "passed" | "warning" | "failed" = messages.some((message) => message.includes("Unauthorized")) || messages.some((message) => message.includes("Missing expected")) ? "failed" : messages.length > 0 ? "warning" : "passed";
    return { fixtureId: fixture.id, status, messages };
  });
  const failedFixtures = findings.filter((finding) => finding.status === "failed").length;
  const warningFixtures = findings.filter((finding) => finding.status === "warning").length;
  return {
    status: failedFixtures > 0 ? "failed" : warningFixtures > 0 ? "warning" : "passed",
    fixturesRun: fixtures.length,
    passedFixtures: findings.filter((finding) => finding.status === "passed").length,
    failedFixtures,
    minimumConfidence: Math.min(...fixtures.map((fixture) => fixture.minimumConfidence)),
    findings,
  };
}

export function buildPassingRagReleaseGateObservations(fixtures: RagEvaluationFixture[] = ragEvaluationFixtures): RagEvaluationObservation[] {
  return fixtures.map((fixture) => ({
    fixtureId: fixture.id,
    sourceIds: fixture.expectedSourceIds,
    confidence: Math.max(fixture.minimumConfidence, 0.74),
    humanReviewRequired: fixture.expectedSourceIds.length === 0,
  }));
}

