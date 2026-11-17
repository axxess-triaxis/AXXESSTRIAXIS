// Processes one claimed lead-sourcing run with the shared crawler core. No AWS or HTTP wiring here:
// fetch, render, verification and the clock are injected, so this is unit-tested without a network.
import { crawlSite, mapLimit } from "../../src/services/leadSourcing/crawl.ts";
import { pickCandidate, type Budget, type Verifier } from "../../src/services/leadSourcing/pick.ts";
import { toWorkerCandidate, type WorkerCandidateInput } from "../../src/services/leadSourcing/sourcingService.ts";
import type { Candidate, FetchText, RenderHtml, Seed, SiteResult } from "../../src/services/leadSourcing/types.ts";

export type ClaimedRun = { id: string; seeds: Seed[]; verifyCap: number };

export type ProcessDeps = {
  fetchText: FetchText;
  render?: RenderHtml;
  verify?: Verifier;
  /** Milliseconds since epoch. */
  now: () => number;
  /** Stop starting new sites after this moment (leaves time to verify and report). */
  deadline: number;
  concurrency?: number;
};

export type ProcessResult = { candidates: WorkerCandidateInput[]; creditsSpent: number; stats: Record<string, number> };

export async function processRun(run: ClaimedRun, deps: ProcessDeps): Promise<ProcessResult> {
  let skippedForTime = 0;
  const sites = (
    await mapLimit(run.seeds, deps.concurrency ?? 3, async (seed): Promise<SiteResult | null> => {
      if (deps.now() >= deps.deadline) {
        skippedForTime++;
        return null;
      }
      return crawlSite(seed, { fetchText: deps.fetchText, render: deps.render });
    })
  ).filter((s): s is SiteResult => s !== null);

  const budget: Budget = { remaining: deps.verify ? run.verifyCap : 0, spent: 0 };
  const date = new Date(deps.now()).toISOString().slice(0, 10);
  const candidates: Candidate[] = [];
  for (const site of sites) {
    const c = await pickCandidate(site, { verify: deps.verify, budget: deps.verify ? budget : undefined, date });
    if (c) candidates.push(c);
  }
  candidates.sort((a, b) => b.score - a.score);
  const count = (k: Candidate["emailKind"]) => candidates.filter((c) => c.emailKind === k).length;
  return {
    candidates: candidates.map(toWorkerCandidate),
    creditsSpent: budget.spent,
    stats: {
      "Sites crawled": sites.length,
      "Sites reached": sites.filter((s) => !s.error).length,
      "Sites skipped for time": skippedForTime,
      "Pages rendered in a browser": sites.reduce((n, s) => n + s.rendered.length, 0),
      "Pages skipped by robots.txt": sites.reduce((n, s) => n + s.skippedByRobots.length, 0),
      "Sites with an on-domain email": sites.filter((s) => s.emails.length).length,
      "Sites with a named leader": sites.filter((s) => s.people.length).length,
      Candidates: candidates.length,
      "Personal address published": count("published-personal"),
      "Guessed and confirmed": count("guessed"),
      "Role inbox": count("published-role"),
    },
  };
}
