import { NextResponse } from "next/server";
import { completeRun, failRun, getRunForWorker } from "../../../../../../repositories/leadSourcingRepository";
import { autoImportRun } from "../../../../../../services/leadSourcing/autoImport";
import { validateWorkerResult } from "../../../../../../services/leadSourcing/sourcingService";
import { workerAuthorized } from "../../../../../../services/leadSourcing/workerAuth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Lead sourcing worker (2026-11-17): posts a claimed run's candidates ({candidates, creditsSpent,
// stats}) or its failure ({failure}). Only a run in "running" can be completed; candidates must match
// the run's own seeds (validateWorkerResult). Runs from a schedule (seed_source "discovery") are then
// imported into the CRM automatically (founder decision 2026-11-18); agent runs still wait for a
// person to approve them through approve_sourced_leads.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!workerAuthorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Unknown run." }, { status: 404 });
  const run = await getRunForWorker(id);
  if (!run) return NextResponse.json({ error: "Unknown run." }, { status: 404 });
  if (run.status !== "running") return NextResponse.json({ error: `Run is ${run.status}.` }, { status: 409 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (body && typeof body.failure === "string") {
    const credits = typeof body.creditsSpent === "number" ? Math.min(Math.max(0, Math.floor(body.creditsSpent)), run.verifyCap) : 0;
    await failRun(run.id, body.failure, credits);
    return NextResponse.json({ status: "failed" });
  }
  const result = validateWorkerResult(run, body);
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 });
  const stats = { ...run.stats, ...result.stats, droppedByServer: result.dropped };
  const stored = await completeRun(run, { candidates: result.candidates, stats, creditsSpent: result.creditsSpent });
  const auto = await autoImportRun({ ...run, status: "done", stats });
  return NextResponse.json({ status: "done", stored, dropped: result.dropped, ...(auto.attempted || auto.reason ? { autoImported: auto.imported, autoSkipped: auto.skipped } : {}) });
}
