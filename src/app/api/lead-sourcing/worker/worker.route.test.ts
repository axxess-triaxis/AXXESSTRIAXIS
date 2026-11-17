// Lead sourcing worker routes with the repository mocked. Reserved domains and invented names only.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const RUN = "11111111-1111-4111-8111-111111111111";
const SECRET = "s".repeat(40);

const state = {
  next: null as Record<string, unknown> | null,
  run: null as Record<string, unknown> | null,
  completed: [] as Array<{ run: unknown; result: { candidates: unknown[]; creditsSpent: number; stats: Record<string, unknown> } }>,
  failed: [] as Array<[string, string, number]>,
};

vi.mock("../../../../repositories/leadSourcingRepository", () => ({
  claimNextRun: async () => state.next,
  getRunForWorker: async (id: string) => (state.run && state.run.id === id ? state.run : null),
  completeRun: async (run: unknown, result: { candidates: unknown[]; creditsSpent: number; stats: Record<string, unknown> }) => {
    state.completed.push({ run, result });
    return result.candidates.length;
  },
  failRun: async (id: string, error: string, credits: number) => {
    state.failed.push([id, error, credits]);
  },
}));

import { POST as claim } from "./claim/route";
import { POST as report } from "./runs/[id]/route";

const req = (body: unknown, auth = `Bearer ${SECRET}`) =>
  new Request("https://example.com/api/lead-sourcing/worker", { method: "POST", headers: auth ? { authorization: auth } : {}, body: JSON.stringify(body) });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

const seeds = [{ segment: "brokerage", country: "AE", company: "Alpha", domain: "alpha.example", source: "Agent seed list" }];

describe("lead sourcing worker routes", () => {
  beforeEach(() => {
    process.env.LEAD_SOURCING_WORKER_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.LEAD_SOURCING_WORKER_SECRET;
    state.next = null;
    state.run = null;
    state.completed = [];
    state.failed = [];
  });

  it("refuses a missing or wrong secret, and refuses everything when the secret is unset or short", async () => {
    expect((await claim(req({}, ""))).status).toBe(401);
    expect((await claim(req({}, "Bearer wrong"))).status).toBe(401);
    process.env.LEAD_SOURCING_WORKER_SECRET = "short";
    expect((await claim(req({}, "Bearer short"))).status).toBe(401);
  });

  it("claim returns seeds and the cap but never the organization", async () => {
    expect(await (await claim(req({}))).json()).toEqual({ run: null });
    state.next = { id: RUN, organizationId: "org-1", seeds, verifyCap: 5, status: "running" };
    const payload = await (await claim(req({}))).json();
    expect(payload).toEqual({ run: { id: RUN, seeds, verifyCap: 5 } });
    expect(JSON.stringify(payload)).not.toContain("org-1");
  });

  it("stores only candidates matching the run's seeds and clamps credits", async () => {
    state.run = { id: RUN, organizationId: "org-1", seeds, verifyCap: 3, status: "running", stats: { excluded: 1 } };
    const res = await report(
      req({
        candidates: [
          { domain: "alpha.example", contactName: "Amara Samplefield", role: "Founder", email: "info@alpha.example", emailKind: "published-role" },
          { domain: "stranger.example", contactName: "Ravi Sampleton", role: "CEO", email: "ravi@stranger.example", emailKind: "guessed" },
        ],
        creditsSpent: 10,
        stats: { "Sites crawled": 1 },
      }),
      params(RUN),
    );
    expect(await res.json()).toEqual({ status: "done", stored: 1, dropped: 1 });
    expect(state.completed[0].result.creditsSpent).toBe(3);
    expect(state.completed[0].result.stats).toEqual({ excluded: 1, "Sites crawled": 1, droppedByServer: 1 });
  });

  it("records a failure, and refuses unknown or finished runs", async () => {
    state.run = { id: RUN, organizationId: "org-1", seeds, verifyCap: 3, status: "running", stats: {} };
    expect(await (await report(req({ failure: "browser crashed", creditsSpent: 9 }), params(RUN))).json()).toEqual({ status: "failed" });
    expect(state.failed).toEqual([[RUN, "browser crashed", 3]]);
    expect((await report(req({ candidates: [] }), params("not-a-uuid"))).status).toBe(404);
    expect((await report(req({ candidates: [] }), params("44444444-4444-4444-8444-444444444444"))).status).toBe(404);
    state.run = { ...state.run, status: "done" };
    expect((await report(req({ candidates: [] }), params(RUN))).status).toBe(409);
    expect((await report(req({ candidates: [] }, "Bearer nope"), params(RUN))).status).toBe(401);
  });

  it("rejects a malformed result body", async () => {
    state.run = { id: RUN, organizationId: "org-1", seeds, verifyCap: 0, status: "running", stats: {} };
    expect((await report(req({ candidates: "x" }), params(RUN))).status).toBe(400);
  });
});
