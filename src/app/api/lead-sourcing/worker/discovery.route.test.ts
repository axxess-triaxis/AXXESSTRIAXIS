// Discovery results route with the repositories mocked. Reserved domains and invented names only.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const RUN = "44444444-4444-4444-8444-444444444444";
const SECRET = "s".repeat(40);

const baseRun = () => ({
  id: RUN, organizationId: "org-1", status: "discovering", seedSource: "discovery", startedAt: "2026-11-18T10:00:00Z",
  discovery: { segment: "brokerage", countries: ["AE"], cities: ["Dubai"], target: 2, maxSearches: 3, trigger: "schedule" }, stats: {},
});

const state = {
  run: null as ReturnType<typeof baseRun> | null,
  queued: [] as Array<{ seeds: Array<Record<string, unknown>>; usage: Record<string, number>; stats: Record<string, unknown> }>,
  finished: [] as Array<{ outcome: { status: string; error?: string; stats: Record<string, unknown> }; usage: Record<string, number> }>,
  queueWins: true,
};

vi.mock("../../../../repositories/leadSourcingScheduleRepository", () => ({
  getDiscoveryRun: async (id: string) => (state.run?.id === id ? state.run : null),
  queueDiscoveredSeeds: async (_run: unknown, seeds: Array<Record<string, unknown>>, usage: Record<string, number>, stats: Record<string, unknown>) => {
    state.queued.push({ seeds, usage, stats });
    return state.queueWins;
  },
  finishDiscovery: async (_run: unknown, outcome: { status: string; error?: string; stats: Record<string, unknown> }, usage: Record<string, number>) => {
    state.finished.push({ outcome, usage });
  },
  loadPastSeedDomains: async () => ["earlier-run.example"],
}));
vi.mock("../../../../repositories/leadSourcingRepository", () => ({
  loadExclusions: async () => ({ companies: new Set<string>(), labels: new Set(["network-friend"]) }),
  loadKnownLeadCompanies: async () => ({ companies: ["Known Realty"], domains: [] }),
}));

import { POST } from "./runs/[id]/seeds/route";

const req = (body: unknown, auth = `Bearer ${SECRET}`) =>
  new Request("https://example.com/api/lead-sourcing/worker/runs/x/seeds", { method: "POST", headers: { authorization: auth }, body: JSON.stringify(body) });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const company = (name: string, domain: string) => ({ company: name, domain, country: "AE", city: "Dubai", evidenceUrl: `https://${domain}/` });

describe("discovery results route", () => {
  beforeEach(() => {
    process.env.LEAD_SOURCING_WORKER_SECRET = SECRET;
    state.run = baseRun();
  });
  afterEach(() => {
    delete process.env.LEAD_SOURCING_WORKER_SECRET;
    Object.assign(state, { run: null, queued: [], finished: [], queueWins: true });
  });

  it("needs the worker secret and a claimed discovery run", async () => {
    expect((await POST(req({}, "Bearer nope"), params(RUN))).status).toBe(401);
    expect((await POST(req({}), params("not-a-uuid"))).status).toBe(404);
    state.run = { ...baseRun(), seedSource: "agent" };
    expect((await POST(req({ companies: [] }), params(RUN))).status).toBe(404);
    state.run = { ...baseRun(), startedAt: null as unknown as string };
    expect((await POST(req({ companies: [] }), params(RUN))).status).toBe(409);
    state.run = { ...baseRun(), status: "queued" };
    expect((await POST(req({ companies: [] }), params(RUN))).status).toBe(409);
  });

  it("drops excluded, known and earlier-run companies, keeps at most the target, and queues the run", async () => {
    const res = await POST(
      req({
        companies: [
          company("Network Friend", "network-friend.example"),
          company("Known Realty", "known-realty.example"),
          company("Earlier", "earlier-run.example"),
          company("Alpha Homes", "alpha-homes.example"),
          company("Beta Estates", "beta-estates.example"),
          company("Gamma Living", "gamma-living.example"),
        ],
        searchCount: 99,
        llmInputTokens: 1200,
        llmOutputTokens: 300,
        stats: { "Searches used": 3, "bad": "text" },
      }),
      params(RUN),
    );
    expect(await res.json()).toEqual({ status: "queued", queued: 2, excluded: 1, duplicates: 2, invalid: 0 });
    const q = state.queued[0];
    expect(q.seeds.map((s) => s.domain)).toEqual(["alpha-homes.example", "beta-estates.example"]);
    expect(q.seeds[0]).toMatchObject({ segment: "brokerage", country: "AE", source: "Automatic discovery" });
    // Searches are clamped to the run's budget.
    expect(q.usage).toEqual({ searchCount: 3, llmInputTokens: 1200, llmOutputTokens: 300 });
    expect(q.stats).toMatchObject({ "Searches used": 3, "Companies proposed": 6, "Companies queued": 2, "Excluded by list": 1 });
    expect(q.stats).not.toHaveProperty("bad");
  });

  it("ends the run as done when nothing is left, and records failures", async () => {
    const res = await POST(req({ companies: [company("Known Realty", "known-realty.example")], searchCount: 1 }), params(RUN));
    expect((await res.json()).status).toBe("done");
    expect(state.finished[0].outcome.status).toBe("done");
    expect(state.queued).toHaveLength(0);

    await POST(req({ failure: "Bedrock access denied", searchCount: 2 }), params(RUN));
    expect(state.finished[1]).toMatchObject({ outcome: { status: "failed", error: "Bedrock access denied" }, usage: { searchCount: 2 } });
    expect((await POST(req({ companies: "nope" }), params(RUN))).status).toBe(400);
  });

  it("reports a conflict if the run moved on while it was being queued", async () => {
    state.queueWins = false;
    expect((await POST(req({ companies: [company("Alpha Homes", "alpha-homes.example")] }), params(RUN))).status).toBe(409);
  });
});
