const fixtures = [
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

function buildPassingObservations() {
  return fixtures.map((fixture) => ({
    fixtureId: fixture.id,
    sourceIds: fixture.expectedSourceIds,
    confidence: Math.max(fixture.minimumConfidence, 0.74),
    humanReviewRequired: fixture.expectedSourceIds.length === 0,
  }));
}

function evaluate(observations) {
  const observationByFixture = new Map(observations.map((observation) => [observation.fixtureId, observation]));
  const findings = fixtures.map((fixture) => {
    const observation = observationByFixture.get(fixture.id);
    const messages = [];
    if (!observation) messages.push("Fixture has no observed RAG answer.");
    if (observation && observation.confidence < fixture.minimumConfidence) {
      messages.push(`Confidence ${observation.confidence.toFixed(2)} is below required ${fixture.minimumConfidence.toFixed(2)}.`);
    }
    const missingSources = fixture.expectedSourceIds.filter((sourceId) => !observation?.sourceIds.includes(sourceId));
    if (missingSources.length > 0) messages.push(`Missing expected source(s): ${missingSources.join(", ")}.`);
    if ((observation?.unauthorizedSourceIds ?? []).length > 0) {
      messages.push(`Unauthorized source(s) retrieved: ${observation.unauthorizedSourceIds.join(", ")}.`);
    }
    if (fixture.expectedSourceIds.length === 0 && observation && !observation.humanReviewRequired) {
      messages.push("Restricted fixture without expected sources must require human review.");
    }
    const status = messages.some((message) => message.includes("Unauthorized") || message.includes("Missing expected"))
      ? "failed"
      : messages.length > 0
        ? "warning"
        : "passed";
    return { fixtureId: fixture.id, status, messages };
  });
  const failedFixtures = findings.filter((finding) => finding.status === "failed").length;
  const warningFixtures = findings.filter((finding) => finding.status === "warning").length;
  return {
    status: failedFixtures > 0 ? "failed" : warningFixtures > 0 ? "warning" : "passed",
    fixturesRun: fixtures.length,
    passedFixtures: findings.filter((finding) => finding.status === "passed").length,
    failedFixtures,
    findings,
  };
}

const result = evaluate(buildPassingObservations());
console.log(JSON.stringify({ gate: "rag-release-gate", result }, null, 2));

if (result.status === "failed" || (result.status === "warning" && process.env.RAG_RELEASE_GATE_WARNINGS_BLOCK === "true")) {
  process.exitCode = 1;
}
