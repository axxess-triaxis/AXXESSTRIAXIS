import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../../../repositories/supabaseAdmin";
import { evaluateRagReleaseGate, isRagEvaluationObservation, ragEvaluationFixtures } from "../../../../services/rag/evaluation/ragEvaluation";

// 2026-11-24: both handlers used to score observations built from the fixtures themselves, so GET always
// answered "passed" and a POST with no body recorded a pass that nothing had earned. Retrieval quality is
// measured by scripts/rag-release-gate.mjs against a real database; this API only scores observations a
// caller supplies, and says so on the row it writes.

export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  return NextResponse.json({
    organizationId: session.user.organizationId,
    status: "not_measured",
    result: null,
    fixtures: ragEvaluationFixtures.map((fixture) => fixture.id),
    message: "No retrieval has been measured by this request. Send observations to score them, or see the RAG Release Gate workflow for measured results.",
  });
}

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { observations?: unknown } | null;
  const observations = body?.observations;
  if (!Array.isArray(observations) || observations.length === 0 || !observations.every(isRagEvaluationObservation)) {
    return NextResponse.json({ error: "A non-empty list of observations is required. Nothing was recorded." }, { status: 400 });
  }

  const result = evaluateRagReleaseGate(ragEvaluationFixtures, observations);

  if (isSupabaseAdminConfigured()) {
    await supabaseAdminRest("rag_release_gates", {
      method: "POST",
      body: {
        organization_id: session.user.organizationId,
        run_by_user_id: session.user.id,
        status: result.status,
        fixtures_run: result.fixturesRun,
        passed_fixtures: result.passedFixtures,
        failed_fixtures: result.failedFixtures,
        minimum_confidence: result.minimumConfidence,
        findings: result.findings,
        release_blocking: result.status === "failed",
        metadata: { observationSource: "client_supplied" },
      },
    }).catch(() => undefined);
  }

  return NextResponse.json({ organizationId: session.user.organizationId, result });
}
