// Lead sourcing page routes (runs, run detail, remove a lead, exclusions list and delete), with the
// repositories and session mocked. Invented ids only.
import { afterEach, describe, expect, it, vi } from "vitest";

const RUN = "33333333-3333-4333-8333-333333333333";
const CAND = "44444444-4444-4444-8444-444444444444";
const EXCL = "55555555-5555-4555-8555-555555555555";

const candidate = (over: Record<string, unknown> = {}) => ({
  id: CAND, runId: RUN, company: "Example Realty LLC", domain: "examplerealty.ae", country: "AE", contactName: "A. Person", role: "Director",
  email: "info@examplerealty.ae", emailKind: "published-role", status: "imported", leadId: "lead-1", importedAutomatically: true, removedAt: null,
  evidence: ["https://examplerealty.ae/contact"], ...over,
});

const state = {
  role: "Manager" as string | null,
  denied: 0,
  candidates: [] as ReturnType<typeof candidate>[],
  removeResult: true,
  removed: [] as Array<{ id: string; leadId: string }>,
  excluded: [] as Array<Record<string, unknown>>,
  audits: [] as string[],
  exclusionDeleted: true,
};

vi.mock("../../../../repositories/leadSourcingRepository", () => ({
  getCandidates: async (_scope: unknown, _run: string, ids: string[]) => state.candidates.filter((c) => ids.includes(c.id)),
  getSourcingRun: async (_scope: unknown, id: string) =>
    id === RUN ? { run: { id: RUN, status: "done", seedSource: "discovery", segment: "brokerage", seedCount: 3, stats: {}, error: null, createdAt: "x", finishedAt: "y" }, candidates: state.candidates } : null,
  addExclusions: async (_scope: unknown, rows: Array<Record<string, unknown>>) => {
    state.excluded.push(...rows);
    return rows.length;
  },
}));
vi.mock("../../../../repositories/leadSourcingScheduleRepository", () => ({
  listRuns: async () => [{ id: RUN, status: "done" }],
  loadCapOverride: async () => null,
  capUsageThisMonth: async () => ({ orgSearches: 12, orgCompanies: 8, globalSearches: 999 }),
  removeSourcedLead: async (_scope: unknown, input: { id: string; leadId: string }) => {
    state.removed.push(input);
    return state.removeResult;
  },
  listExclusions: async () => [{ id: EXCL, companyNorm: "example realty", domainLabel: "examplerealty", reason: "manual", createdAt: "x" }],
  deleteExclusion: async () => state.exclusionDeleted,
}));
vi.mock("../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => (state.role ? { user: { id: "user-1", role: state.role, organizationId: "org-1" }, accessToken: "t" } : null),
}));
vi.mock("../../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string }) => ({ organizationId: user.organizationId, userId: user.id }),
  auditLogsRepository: {
    record: async (_scope: unknown, entry: { action: string }) => {
      state.audits.push(entry.action);
    },
  },
}));
vi.mock("../../../../services/audit/auditEvents", () => ({
  recordDeniedAttempt: async () => {
    state.denied += 1;
  },
}));

import { GET as listRunsRoute } from "./route";
import { GET as runDetail } from "./[id]/route";
import { POST as removeLead } from "./[id]/candidates/[cid]/remove/route";
import { DELETE as deleteExclusion, GET as listExclusions } from "../exclusions/route";

const post = (body: unknown) => new Request("https://example.com/x", { method: "POST", body: JSON.stringify(body) });
const removeParams = (id = RUN, cid = CAND) => ({ params: Promise.resolve({ id, cid }) });

describe("lead sourcing page routes", () => {
  afterEach(() => {
    Object.assign(state, { role: "Manager", denied: 0, candidates: [], removeResult: true, removed: [], excluded: [], audits: [], exclusionDeleted: true });
  });

  it("refuses signed-out users and non-senior roles on every route, and records the denial", async () => {
    state.role = null;
    expect((await listRunsRoute()).status).toBe(401);
    state.role = "Employee";
    expect((await listRunsRoute()).status).toBe(403);
    expect((await runDetail(new Request("https://example.com"), { params: Promise.resolve({ id: RUN }) })).status).toBe(403);
    expect((await removeLead(post({}), removeParams())).status).toBe(403);
    expect((await listExclusions()).status).toBe(403);
    expect((await deleteExclusion(new Request(`https://example.com/x?id=${EXCL}`, { method: "DELETE" }))).status).toBe(403);
    expect(state.denied).toBe(5);
    expect(state.removed).toEqual([]);
  });

  it("returns runs with the organization's usage only, never the platform-wide figure", async () => {
    const body = await (await listRunsRoute()).json();
    expect(body.runs).toHaveLength(1);
    expect(body.usage).toEqual({ searches: 12, searchLimit: 300, companies: 8, companyLimit: 200 });
    expect(JSON.stringify(body)).not.toContain("999");
  });

  it("returns a run's candidates and 404s an unknown or malformed id", async () => {
    state.candidates = [candidate()];
    const ok = await runDetail(new Request("https://example.com"), { params: Promise.resolve({ id: RUN }) });
    const body = await ok.json();
    expect(body.candidates[0]).toMatchObject({ company: "Example Realty LLC", importedAutomatically: true, emailKind: "published-role" });
    expect((await runDetail(new Request("https://example.com"), { params: Promise.resolve({ id: "nope" }) })).status).toBe(404);
    expect((await runDetail(new Request("https://example.com"), { params: Promise.resolve({ id: CAND }) })).status).toBe(404);
  });

  it("removes an untouched imported lead, adds the company to exclusions when asked, and audits it", async () => {
    state.candidates = [candidate()];
    const res = await removeLead(post({ exclude: true }), removeParams());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ removed: true, excluded: 1 });
    expect(state.removed).toEqual([{ id: CAND, leadId: "lead-1" }]);
    expect(state.excluded[0]).toMatchObject({ domainLabel: "examplerealty", reason: "manual" });
    expect(state.audits).toContain("lead_sourcing.lead_removed");
  });

  it("does not exclude unless asked", async () => {
    state.candidates = [candidate()];
    expect(await (await removeLead(post({}), removeParams())).json()).toEqual({ removed: true, excluded: 0 });
    expect(state.excluded).toEqual([]);
  });

  it("refuses with 409 when someone already worked the lead, and excludes nothing", async () => {
    state.candidates = [candidate()];
    state.removeResult = false;
    const res = await removeLead(post({ exclude: true }), removeParams());
    expect(res.status).toBe(409);
    expect(state.excluded).toEqual([]);
    expect(state.audits).toEqual([]);
  });

  it("404s a candidate that was never imported, and is idempotent for one already removed", async () => {
    state.candidates = [candidate({ status: "pending", leadId: null })];
    expect((await removeLead(post({}), removeParams())).status).toBe(404);
    state.candidates = [candidate({ removedAt: "2026-11-18T00:00:00Z" })];
    expect(await (await removeLead(post({ exclude: true }), removeParams())).json()).toEqual({ removed: true, excluded: 0 });
    expect(state.removed).toEqual([]);
  });

  it("lists exclusions and deletes one by id, 404 for an unknown id", async () => {
    expect((await (await listExclusions()).json()).exclusions).toHaveLength(1);
    const ok = await deleteExclusion(new Request(`https://example.com/x?id=${EXCL}`, { method: "DELETE" }));
    expect(ok.status).toBe(200);
    expect(state.audits).toContain("lead_sourcing.exclusion_removed");
    state.exclusionDeleted = false;
    expect((await deleteExclusion(new Request(`https://example.com/x?id=${EXCL}`, { method: "DELETE" }))).status).toBe(404);
    expect((await deleteExclusion(new Request("https://example.com/x?id=bad", { method: "DELETE" }))).status).toBe(404);
  });
});
