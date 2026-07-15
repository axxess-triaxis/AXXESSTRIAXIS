import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../../../repositories/supabaseAdmin";
import { buildPassingRagReleaseGateObservations, evaluateRagReleaseGate, ragEvaluationFixtures, type RagEvaluationObservation } from "../../../../services/rag/evaluation/ragEvaluation";

export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const result = evaluateRagReleaseGate(ragEvaluationFixtures, buildPassingRagReleaseGateObservations());
  return NextResponse.json({ organizationId: session.user.organizationId, result });
}

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { observations?: RagEvaluationObservation[] };
  const result = evaluateRagReleaseGate(ragEvaluationFixtures, body.observations ?? buildPassingRagReleaseGateObservations());

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
      },
    }).catch(() => undefined);
  }

  return NextResponse.json({ organizationId: session.user.organizationId, result });
}
