import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkLead } from "../../../repositories/leadWorkRepository";

type Session = { user: { id: string; organizationId: string; role: string }; accessToken?: string };
const state = { session: null as Session | null };
const calls = {
  updates: [] as Array<{ id: string; input: Record<string, unknown> }>,
  recorded: [] as Array<Record<string, unknown>>,
  audits: [] as Array<{ action: string; metadata?: Record<string, unknown> }>,
  denied: [] as unknown[],
  milestones: [] as Array<{ leadId: string; milestone: Record<string, unknown> }>,
  stopped: [] as Array<{ organizationId: string; leadId: string; reason: string }>,
};
const stopState = { count: 1 };
let leads: WorkLead[] = [];
let staffIds = new Set<string>();
let attemptsByLead = new Map<string, { channel: "voice_human" | "email"; at: Date }[]>();

const lead = (over: Partial<WorkLead> = {}): WorkLead => ({
  id: "l1", title: "Acme - Asha", phoneE164: "+919876543210", country: "IN", consentBasis: "opt_in", stage: "new", status: "open",
  ownerUserId: "emp", registryStatus: "unchecked", registryCheckedAt: null, ...over,
});

vi.mock("../../../auth/serverSession", () => ({ getServerAuthSession: async () => state.session }));
vi.mock("../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (u: Session["user"]) => ({ userId: u.id, organizationId: u.organizationId, role: u.role }),
  auditLogsRepository: { record: async (_s: unknown, e: { action: string }) => { calls.audits.push(e); } },
}));
vi.mock("../../../services/audit/auditEvents", () => ({ recordDeniedAttempt: async (_s: unknown, a: unknown) => { calls.denied.push(a); } }));
vi.mock("../../../repositories/crmRepository", () => ({
  updateCrmLead: async (_s: unknown, id: string, input: Record<string, unknown>) => { calls.updates.push({ id, input }); return { id, ...input }; },
}));
const jobsState = { fail: false };
vi.mock("../../../repositories/agentCallRepository", () => ({
  latestAgentCallJobs: async () => { if (jobsState.fail) throw new Error('relation "agent_call_jobs" does not exist'); return new Map(); },
}));
vi.mock("../../../repositories/leadWorkRepository", async (original) => ({
  isOwnLead: (await original<typeof import("../../../repositories/leadWorkRepository")>()).isOwnLead,
  getLead: async (_s: unknown, id: string) => leads.find((l) => l.id === id) ?? null,
  listOpenLeads: async (_s: unknown, owner?: string) => leads.filter((l) => !owner || l.ownerUserId === owner || l.createdBy === owner),
  loadCallContext: async () => ({ suppressed: new Set<string>(), attemptsByLead }),
  recordCall: async (_s: unknown, c: Record<string, unknown>) => { calls.recorded.push(c); },
  recordMilestone: async (_s: unknown, leadId: string, milestone: Record<string, unknown>) => { calls.milestones.push({ leadId, milestone }); },
  isActiveStaffMember: async (_s: unknown, id: string) => staffIds.has(id),
  listActiveStaff: async () => [{ id: "emp", displayName: "Emp" }],
  loadLeadHistory: async () => [{ kind: "change", at: "2026-11-13T00:00:00Z", action: "crm.lead.updated", metadata: {} }],
}));

vi.mock("../../../repositories/replyRepository", () => ({
  stopActiveEnrollments: async (organizationId: string, leadId: string, reason: string) => { calls.stopped.push({ organizationId, leadId, reason }); return stopState.count; },
}));

import { PATCH } from "./leads/[id]/route";
import { POST as logMilestone } from "./leads/[id]/milestones/route";
import { GET as history } from "./leads/[id]/history/route";
import { POST as logCall } from "./leads/[id]/calls/route";
import { GET as queue } from "./call-queue/route";
import { GET as staff } from "./staff/route";

const as = (role: string, id = role === "Employee" ? "emp" : "mgr") => { state.session = { user: { id, organizationId: "org-1", role } }; };
const json = (body: unknown, method = "POST") => new Request("http://localhost/api/crm", { method, body: JSON.stringify(body) });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const TEN_IST = new Date("2026-11-13T04:30:00Z");

describe("lead work routes", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(TEN_IST);
    leads = [lead(), lead({ id: "l2", ownerUserId: "other", consentBasis: "b2b_legitimate_interest" })];
    staffIds = new Set(["emp", "other"]);
    attemptsByLead = new Map();
  });
  afterEach(() => {
    vi.useRealTimers();
    stopState.count = 1;
    state.session = null;
    for (const list of Object.values(calls)) list.length = 0;
  });

  it("all require a session, and roles without CRM access are refused", async () => {
    expect((await PATCH(json({ stage: "proposal" }, "PATCH"), params("l1"))).status).toBe(401);
    expect((await queue()).status).toBe(401);
    as("Guest", "g");
    expect((await PATCH(json({ stage: "proposal" }, "PATCH"), params("l1"))).status).toBe(403);
    expect((await queue()).status).toBe(403);
    expect((await staff()).status).toBe(403);
    expect(calls.updates).toEqual([]);
  });

  it("an Employee may move their own lead's stage but not reassign it or touch others' leads", async () => {
    as("Employee");
    expect((await PATCH(json({ stage: "proposal" }, "PATCH"), params("l1"))).status).toBe(200);
    expect((await PATCH(json({ ownerUserId: "other" }, "PATCH"), params("l1"))).status).toBe(403);
    expect((await PATCH(json({ stage: "proposal" }, "PATCH"), params("l2"))).status).toBe(404);
    expect((await history(new Request("http://localhost"), params("l2"))).status).toBe(404);
    expect(calls.updates).toEqual([{ id: "l1", input: { stage: "proposal" } }]);
    expect(calls.audits.map((a) => a.action)).toEqual(["crm.lead.updated"]);
  });

  it("a Manager may reassign, but only to an active staff member of the organization", async () => {
    as("Manager");
    expect((await PATCH(json({ ownerUserId: "other" }, "PATCH"), params("l1"))).status).toBe(200);
    expect((await PATCH(json({ ownerUserId: "stranger" }, "PATCH"), params("l1"))).status).toBe(400);
    expect(calls.updates).toEqual([{ id: "l1", input: { ownerUserId: "other" } }]);
    expect((await staff()).status).toBe(200);
  });

  it("rejects unknown stages, statuses, fields and bad dates", async () => {
    as("Manager");
    expect((await PATCH(json({ stage: "won-ish" }, "PATCH"), params("l1"))).status).toBe(400);
    expect((await PATCH(json({ status: "deleted" }, "PATCH"), params("l1"))).status).toBe(400);
    expect((await PATCH(json({ nextFollowUpAt: "soon" }, "PATCH"), params("l1"))).status).toBe(400);
    expect((await PATCH(json({}, "PATCH"), params("l1"))).status).toBe(400);
    expect(calls.updates).toEqual([]);
  });

  it("the call queue shows an Employee only their leads; opted-in is callable, cold B2B is refused with reasons", async () => {
    as("Employee");
    const own = await (await queue()).json();
    expect(own.callable.map((l: { id: string }) => l.id)).toEqual(["l1"]);
    expect(own.callable[0].agentCall).toEqual({ allowed: false, reasons: ["dlt_registration_missing", "counsel_sign_off_missing"] });
    expect(own.callable[0].agentJob).toBeNull();

    // The human queue still loads if the agent_call_jobs table is not there yet.
    jobsState.fail = true;
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const withoutJobs = await queue();
    jobsState.fail = false;
    expect(withoutJobs.status).toBe(200);
    expect((await withoutJobs.json()).callable[0].agentJob).toBeNull();
    expect(own.refused).toEqual([]);
    as("Manager");
    const all = await (await queue()).json();
    expect(all.callable.map((l: { id: string }) => l.id)).toEqual(["l1"]);
    expect(all.refused[0].lead.id).toBe("l2");
    expect(all.refused[0].reasons).toEqual(expect.arrayContaining(["dlt_registration_missing", "counsel_sign_off_missing"]));
  });

  it("logging an allowed call records one attempt with the outcome and moves an interested lead forward", async () => {
    as("Employee");
    const response = await logCall(json({ outcome: "interested", note: "Wants a demo" }), params("l1"));
    expect(response.status).toBe(201);
    expect(calls.recorded).toEqual([{ leadId: "l1", decision: "allowed", reasons: [], outcome: "interested", note: "Wants a demo" }]);
    expect(calls.updates).toEqual([{ id: "l1", input: { stage: "qualifying" } }]);
  });

  it("a call the gate refuses is logged as refused and returns 409 with the reasons", async () => {
    as("Manager");
    const response = await logCall(json({ outcome: "connected" }), params("l2"));
    expect(response.status).toBe(409);
    expect((await response.json()).reasons).toEqual(expect.arrayContaining(["dlt_registration_missing"]));
    expect(calls.recorded).toEqual([expect.objectContaining({ leadId: "l2", decision: "refused", outcome: null })]);
    expect(calls.updates).toEqual([]);
  });

  it("refuses a second call on the same day, and rejects bad outcomes and long notes", async () => {
    as("Employee");
    attemptsByLead = new Map([["l1", [{ channel: "voice_human", at: new Date(TEN_IST.getTime() - 60_000) }]]]);
    expect((await logCall(json({ outcome: "no_answer" }), params("l1"))).status).toBe(409);
    expect((await logCall(json({ outcome: "maybe" }), params("l1"))).status).toBe(400);
    expect((await logCall(json({ outcome: "no_answer", note: "x".repeat(501) }), params("l1"))).status).toBe(400);
  });

  it("milestones need a session, CRM access and a lead the caller can see", async () => {
    expect((await logMilestone(json({ kind: "meeting_booked" }), params("l1"))).status).toBe(401);
    as("Guest", "g");
    expect((await logMilestone(json({ kind: "meeting_booked" }), params("l1"))).status).toBe(403);
    as("Employee");
    expect((await logMilestone(json({ kind: "meeting_booked" }), params("l2"))).status).toBe(404);
    expect(calls.milestones).toEqual([]);
    expect(calls.stopped).toEqual([]);
  });

  it("rejects an unknown kind, a bad or far-future date, and a long note", async () => {
    as("Employee");
    expect((await logMilestone(json({ kind: "paid" }), params("l1"))).status).toBe(400);
    expect((await logMilestone(json({ kind: "meeting_held", occurredAt: "soon" }), params("l1"))).status).toBe(400);
    const nextWeek = new Date(TEN_IST.getTime() + 7 * 86_400_000).toISOString();
    expect((await logMilestone(json({ kind: "meeting_booked", occurredAt: nextWeek }), params("l1"))).status).toBe(400);
    expect((await logMilestone(json({ kind: "meeting_held", note: "x".repeat(501) }), params("l1"))).status).toBe(400);
    expect(calls.milestones).toEqual([]);
  });

  it("logging a booked meeting records it, stops outreach, moves a new lead to qualifying and audits it", async () => {
    as("Employee");
    const response = await logMilestone(json({ kind: "meeting_booked", note: " Demo Tue " }), params("l1"));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ kind: "meeting_booked", occurredAt: TEN_IST.toISOString(), changes: { stage: "qualifying" }, stoppedEnrollments: 1 });
    expect(calls.milestones).toEqual([{ leadId: "l1", milestone: { kind: "meeting_booked", occurredAt: TEN_IST.toISOString(), note: "Demo Tue" } }]);
    expect(calls.stopped).toEqual([{ organizationId: "org-1", leadId: "l1", reason: "milestone_meeting_booked" }]);
    expect(calls.updates).toEqual([{ id: "l1", input: { stage: "qualifying" } }]);
    expect(calls.audits).toEqual([expect.objectContaining({
      action: "crm.lead.milestone_recorded", metadata: { kind: "meeting_booked", occurredAt: TEN_IST.toISOString(), stoppedEnrollments: 1, stage: "qualifying" },
    })]);
  });

  it("a Manager may log a trial on someone else's lead; a lead past proposal keeps its stage", async () => {
    as("Manager");
    leads = [lead({ id: "l2", ownerUserId: "other", stage: "negotiation" })];
    stopState.count = 0;
    const response = await logMilestone(json({ kind: "trial_started", occurredAt: "2026-11-12T09:00:00Z" }), params("l2"));
    expect(response.status).toBe(201);
    expect((await response.json()).changes).toEqual({});
    expect(calls.milestones[0].milestone).toMatchObject({ kind: "trial_started", occurredAt: "2026-11-12T09:00:00.000Z", note: null });
    expect(calls.updates).toEqual([]);
  });
});
