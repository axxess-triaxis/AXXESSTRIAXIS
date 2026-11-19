import { NextResponse } from "next/server";
import { loadExclusions, loadKnownLeadCompanies } from "../../../../../../../repositories/leadSourcingRepository";
import { finishDiscovery, getDiscoveryRun, loadPastSeedDomains, queueDiscoveredSeeds } from "../../../../../../../repositories/leadSourcingScheduleRepository";
import type { TenantScope } from "../../../../../../../repositories/interfaces";
import { knownSets } from "../../../../../../../services/leadSourcing/seeds";
import { MAX_SEEDS_PER_RUN, planRun } from "../../../../../../../services/leadSourcing/sourcingService";
import { workerAuthorized } from "../../../../../../../services/leadSourcing/workerAuth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const count = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.floor(v))) : 0);

// Lead sourcing discovery results (2026-11-18). The worker posts the companies it found on Bedrock
// ({companies, searchCount, llmInputTokens, llmOutputTokens, stats}) or a failure ({failure, ...}).
// The server applies the same rules as an agent-started run (exclusion list, known leads, earlier
// runs' domains, de-duplication), keeps at most the run's target, and queues the run for crawling.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!workerAuthorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;
  const run = UUID.test(id) ? await getDiscoveryRun(id) : null;
  if (!run || run.seedSource !== "discovery" || !run.discovery) return NextResponse.json({ error: "Unknown run." }, { status: 404 });
  if (run.status !== "discovering" || !run.startedAt) return NextResponse.json({ error: `Run is ${run.status}.` }, { status: 409 });

  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const spec = run.discovery;
  const usage = {
    // A worker can never report more searches than the run was allowed.
    searchCount: count(body.searchCount, spec.maxSearches),
    llmInputTokens: count(body.llmInputTokens, 10_000_000),
    llmOutputTokens: count(body.llmOutputTokens, 10_000_000),
  };
  const workerStats: Record<string, number> = {};
  if (body.stats && typeof body.stats === "object") {
    for (const [k, v] of Object.entries(body.stats as Record<string, unknown>).slice(0, 20)) if (typeof v === "number" && Number.isFinite(v)) workerStats[k.slice(0, 60)] = v;
  }

  if (typeof body.failure === "string") {
    await finishDiscovery(run, { status: "failed", error: body.failure, stats: { ...run.stats, ...workerStats } }, usage);
    return NextResponse.json({ status: "failed" });
  }
  if (!Array.isArray(body.companies)) return NextResponse.json({ error: "companies must be an array." }, { status: 400 });

  // Worker-side org reads use the run's own organization; nothing here acts as a user.
  const scope = { organizationId: run.organizationId, userId: "", role: "Super Admin" } as TenantScope;
  const [exclusion, known, pastDomains] = await Promise.all([loadExclusions(scope), loadKnownLeadCompanies(scope), loadPastSeedDomains(run.organizationId)]);
  const plan = planRun({
    rawSeeds: body.companies.slice(0, MAX_SEEDS_PER_RUN),
    segment: spec.segment,
    requestedVerify: 0,
    exclusion,
    known: knownSets(known.companies, [...known.domains, ...pastDomains]),
    creditsUsedThisMonth: 0,
    monthlyCap: 0,
  });
  const proposed = body.companies.length;
  if (!plan.ok) {
    const stats = { ...run.stats, ...workerStats, "Companies proposed": proposed, "Companies queued": 0 };
    await finishDiscovery(run, { status: "done", error: plan.reason, stats }, usage);
    return NextResponse.json({ status: "done", queued: 0, reason: plan.reason });
  }
  const seeds = plan.seeds.slice(0, spec.target).map((s) => ({ ...s, segment: spec.segment, source: "Automatic discovery" }));
  const stats = {
    ...run.stats,
    ...workerStats,
    "Companies proposed": proposed,
    "Excluded by list": plan.excluded,
    "Already known or duplicate": plan.duplicates,
    "Invalid": plan.invalid.length,
    "Companies queued": seeds.length,
  };
  if (!(await queueDiscoveredSeeds(run, seeds, usage, stats))) return NextResponse.json({ error: "Run moved on." }, { status: 409 });
  return NextResponse.json({ status: "queued", queued: seeds.length, excluded: plan.excluded, duplicates: plan.duplicates, invalid: plan.invalid.length });
}
