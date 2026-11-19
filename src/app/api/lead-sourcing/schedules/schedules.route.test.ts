// Lead sourcing schedule routes and the worker tick, with the repository and session mocked.
// Invented ids only.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = "s".repeat(40);
const SCHED = "22222222-2222-4222-8222-222222222222";

const schedule = (over: Record<string, unknown> = {}) => ({
  id: SCHED, organizationId: "org-1", name: "Dubai brokers", segment: "brokerage", countries: ["AE"], cities: ["Dubai"], perRun: 10,
  cadence: "daily", dayOfWeek: null, dayOfMonth: null, hourLocal: 9, timezone: "Asia/Dubai", enabled: true,
  nextRunAt: "2026-11-18T05:00:00+00:00", lastRunAt: null, lastSkipReason: null, createdBy: "user-1", createdAt: "", updatedAt: "", ...over,
});

const state = {
  role: "Super Admin" as string | null,
  schedules: [] as ReturnType<typeof schedule>[],
  due: [] as ReturnType<typeof schedule>[],
  advanced: [] as Array<[string, string, string]>,
  advanceWins: true,
  usage: { orgSearches: 0, orgCompanies: 0, globalSearches: 0 },
  runs: [] as Array<{ scheduleId: string; spec: Record<string, unknown>; user: string | null }>,
  outcomes: [] as Array<[string, { ranAt?: Date; skipReason: string | null }]>,
  created: [] as Array<{ input: Record<string, unknown>; next: Date | null }>,
  denied: 0,
  claim: null as Record<string, unknown> | null,
};

vi.mock("../../../../repositories/leadSourcingScheduleRepository", () => ({
  MAX_SCHEDULES_PER_ORG: 2,
  listSchedules: async () => state.schedules,
  getSchedule: async (_scope: unknown, id: string) => state.schedules.find((s) => s.id === id) ?? null,
  createSchedule: async (_scope: unknown, input: Record<string, unknown>, next: Date | null) => {
    state.created.push({ input, next });
    return schedule({ ...input, nextRunAt: next?.toISOString() ?? null });
  },
  updateSchedule: async (_scope: unknown, id: string, input: Record<string, unknown>, next: Date | null) => {
    const s = state.schedules.find((x) => x.id === id);
    return s ? { ...s, ...input, nextRunAt: next?.toISOString() ?? null } : null;
  },
  deleteSchedule: async (_scope: unknown, id: string) => state.schedules.some((s) => s.id === id),
  loadCapOverride: async () => null,
  capUsageThisMonth: async () => state.usage,
  dueSchedules: async () => state.due,
  advanceSchedule: async (id: string, expected: string, next: Date) => {
    state.advanced.push([id, expected, next.toISOString()]);
    return state.advanceWins;
  },
  noteScheduleOutcome: async (id: string, o: { ranAt?: Date; skipReason: string | null }) => {
    state.outcomes.push([id, o]);
  },
  createDiscoveryRun: async (s: { id: string }, spec: Record<string, unknown>, user: string | null) => {
    state.runs.push({ scheduleId: s.id, spec, user });
    return { id: "run-1" };
  },
  claimNextDiscovery: async () => state.claim,
  expireUnclaimedDiscovery: async () => undefined,
}));

vi.mock("../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => (state.role ? { user: { id: "user-1", role: state.role, organizationId: "org-1" }, accessToken: "t" } : null),
}));
vi.mock("../../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string }) => ({ organizationId: user.organizationId, userId: user.id }),
  auditLogsRepository: { record: async () => undefined },
}));
vi.mock("../../../../services/audit/auditEvents", () => ({
  recordDeniedAttempt: async () => {
    state.denied += 1;
  },
}));

import { GET as list, POST as create } from "./route";
import { DELETE as remove, PATCH as patch } from "./[id]/route";
import { POST as runNow } from "./[id]/run/route";
import { POST as tick } from "../worker/tick/route";
import { POST as claimDiscovery } from "../worker/claim-discovery/route";

const json = (body: unknown, auth?: string) =>
  new Request("https://example.com/api/lead-sourcing", { method: "POST", headers: auth ? { authorization: auth } : {}, body: JSON.stringify(body) });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("lead sourcing schedule routes", () => {
  beforeEach(() => {
    process.env.LEAD_SOURCING_WORKER_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.LEAD_SOURCING_WORKER_SECRET;
    Object.assign(state, {
      role: "Super Admin", schedules: [], due: [], advanced: [], advanceWins: true, usage: { orgSearches: 0, orgCompanies: 0, globalSearches: 0 },
      runs: [], outcomes: [], created: [], denied: 0, claim: null,
    });
  });

  it("refuses signed-out users and roles without senior lead access, and records the denial", async () => {
    state.role = null;
    expect((await list()).status).toBe(401);
    state.role = "Employee";
    expect((await list()).status).toBe(403);
    expect((await create(json({}))).status).toBe(403);
    expect((await runNow(json({}), params(SCHED))).status).toBe(403);
    expect(state.denied).toBe(3);
  });

  it("creates a valid schedule with its next slot, and rejects invalid input or too many schedules", async () => {
    expect((await create(json({ name: "x" }))).status).toBe(400);
    const res = await create(json({ name: "Dubai brokers", segment: "brokerage", countries: ["AE"], cities: ["Dubai"], perRun: 10, cadence: "daily", timezone: "Asia/Dubai" }));
    expect(res.status).toBe(201);
    expect(state.created[0].next?.getTime()).toBeGreaterThan(Date.now());
    const off = await create(json({ name: "Off", segment: "clinic", countries: ["IN"], enabled: false }));
    expect(state.created[1].next).toBeNull();
    expect(off.status).toBe(201);
    state.schedules = [schedule(), schedule({ id: "other" })];
    expect((await create(json({ name: "Third", segment: "clinic", countries: ["IN"] }))).status).toBe(400);
  });

  it("edits, turns off and deletes only schedules in the organization", async () => {
    state.schedules = [schedule()];
    const off = await (await patch(json({ enabled: false }), params(SCHED))).json();
    expect(off.schedule).toMatchObject({ enabled: false, nextRunAt: null });
    expect((await patch(json({ perRun: 1 }), params(SCHED))).status).toBe(400);
    expect((await patch(json({}), params("33333333-3333-4333-8333-333333333333"))).status).toBe(404);
    expect((await patch(json({}), params("not-a-uuid"))).status).toBe(404);
    expect((await remove(json({}), params(SCHED))).status).toBe(200);
    expect((await remove(json({}), params("33333333-3333-4333-8333-333333333333"))).status).toBe(404);
  });

  it("Run now starts a discovery run within the caps, or says why not", async () => {
    state.schedules = [schedule()];
    const res = await runNow(json({}), params(SCHED));
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ started: true, runId: "run-1", target: 10, maxSearches: 15 });
    expect(state.runs[0]).toMatchObject({ scheduleId: SCHED, user: "user-1", spec: { segment: "brokerage", countries: ["AE"], cities: ["Dubai"], trigger: "manual" } });
    state.usage = { orgSearches: 0, orgCompanies: 200, globalSearches: 0 };
    const capped = await runNow(json({}), params(SCHED));
    expect(capped.status).toBe(409);
    expect(state.runs).toHaveLength(1);
    expect(state.outcomes.at(-1)?.[1].skipReason).toContain("company");
  });
});

describe("lead sourcing worker tick and discovery claim", () => {
  beforeEach(() => {
    process.env.LEAD_SOURCING_WORKER_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.LEAD_SOURCING_WORKER_SECRET;
    Object.assign(state, { due: [], advanced: [], advanceWins: true, usage: { orgSearches: 0, orgCompanies: 0, globalSearches: 0 }, runs: [], outcomes: [], claim: null });
  });

  it("needs the worker secret", async () => {
    expect((await tick(json({}))).status).toBe(401);
    expect((await claimDiscovery(json({}, "Bearer wrong"))).status).toBe(401);
  });

  it("turns each due schedule into one discovery run and moves it to its next slot", async () => {
    state.due = [schedule()];
    const res = await (await tick(json({}, `Bearer ${SECRET}`))).json();
    expect(res).toEqual({ due: 1, started: 1, skipped: 0, lost: 0 });
    expect(state.advanced[0][0]).toBe(SCHED);
    expect(state.advanced[0][1]).toBe("2026-11-18T05:00:00+00:00");
    expect(Date.parse(state.advanced[0][2])).toBeGreaterThan(Date.now());
    expect(state.runs[0].spec).toMatchObject({ trigger: "schedule", target: 10 });
    expect(state.runs[0].user).toBe("user-1");
  });

  it("creates nothing when another tick already took the slot, and records cap skips", async () => {
    state.due = [schedule()];
    state.advanceWins = false;
    expect(await (await tick(json({}, `Bearer ${SECRET}`))).json()).toEqual({ due: 1, started: 0, skipped: 0, lost: 1 });
    state.advanceWins = true;
    state.usage = { orgSearches: 0, orgCompanies: 0, globalSearches: 4500 };
    expect(await (await tick(json({}, `Bearer ${SECRET}`))).json()).toEqual({ due: 1, started: 0, skipped: 1, lost: 0 });
    expect(state.runs).toHaveLength(0);
    expect(state.outcomes.at(-1)?.[1].skipReason).toContain("Platform");
  });

  it("claim returns what to look for and the budget, never the organization", async () => {
    expect(await (await claimDiscovery(json({}, `Bearer ${SECRET}`))).json()).toEqual({ run: null });
    state.claim = { id: "run-9", organizationId: "org-1", discovery: { segment: "clinic", countries: ["IN"], cities: [], target: 5, maxSearches: 8, trigger: "schedule" } };
    const payload = await (await claimDiscovery(json({}, `Bearer ${SECRET}`))).json();
    expect(payload).toEqual({ run: { id: "run-9", segment: "clinic", countries: ["IN"], cities: [], target: 5, maxSearches: 8 } });
    expect(JSON.stringify(payload)).not.toContain("org-1");
  });
});
