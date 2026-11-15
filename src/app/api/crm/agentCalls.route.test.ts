import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkLead } from "../../../repositories/leadWorkRepository";
import { CURRENT_REGISTRATIONS } from "../../../services/outbound/callQueue";

type Session = { user: { id: string; organizationId: string; role: string } };
const state = { session: null as Session | null, start: { ok: true } as { ok: true } | { ok: false; reason: string }, configured: true };
const calls = {
  recorded: [] as Array<Record<string, unknown>>,
  statuses: [] as Array<Record<string, unknown>>,
  started: [] as Array<Record<string, unknown>>,
  created: [] as string[],
};
let leads: WorkLead[] = [];
let suppressedAi = new Set<string>();

const lead = (over: Partial<WorkLead> = {}): WorkLead => ({
  id: "l1", title: "Acme - Asha", phoneE164: "+919876543210", country: "IN", consentBasis: "opt_in", stage: "new", status: "open",
  ownerUserId: "emp", registryStatus: "unchecked", registryCheckedAt: null, ...over,
});

vi.mock("../../../auth/serverSession", () => ({ getServerAuthSession: async () => state.session }));
vi.mock("../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (u: Session["user"]) => ({ userId: u.id, organizationId: u.organizationId, role: u.role }),
}));
vi.mock("../../../services/audit/auditEvents", () => ({ recordDeniedAttempt: async () => undefined }));
vi.mock("../../../repositories/leadWorkRepository", async (original) => ({
  isOwnLead: (await original<typeof import("../../../repositories/leadWorkRepository")>()).isOwnLead,
  getLead: async (_s: unknown, id: string) => leads.find((l) => l.id === id) ?? null,
  loadCallContext: async () => ({ suppressed: new Set<string>(), suppressedAi, attemptsByLead: new Map() }),
  recordCall: async (_s: unknown, c: Record<string, unknown>) => { calls.recorded.push(c); },
}));
vi.mock("../../../repositories/agentCallRepository", () => ({
  createAgentCallJob: async (_s: unknown, leadId: string) => { calls.created.push(leadId); return { id: "job-1", leadId, status: "queued" }; },
  setAgentCallJobStatus: async (_s: unknown, jobId: string, change: Record<string, unknown>) => { calls.statuses.push({ jobId, ...change }); },
  latestAgentCallJobs: async () => new Map([["l1", { id: "job-1", leadId: "l1", status: "completed", outcome: "interested" }]]),
}));
vi.mock("../../../services/outbound/callismaticClient", () => ({
  isCallismaticConfigured: () => state.configured,
  startAgentCall: async (r: Record<string, unknown>) => { calls.started.push(r); return state.start; },
}));

import { GET, POST } from "./leads/[id]/agent-calls/route";

const as = (role: string, id = role === "Employee" ? "emp" : "mgr") => { state.session = { user: { id, organizationId: "org-1", role } }; };
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const req = () => new Request("http://localhost/api/crm/leads/l1/agent-calls", { method: "POST" });
const TEN_IST = new Date("2026-11-13T04:30:00Z");

describe("agent call route", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(TEN_IST);
    leads = [lead(), lead({ id: "l2", ownerUserId: "other" })];
    suppressedAi = new Set();
    state.start = { ok: true };
    state.configured = true;
  });
  afterEach(() => {
    vi.useRealTimers();
    Object.assign(CURRENT_REGISTRATIONS, { dltIndia: false, tdraUae: false, counselSignedOff: false });
    for (const list of Object.values(calls)) list.length = 0;
  });

  it("refuses every agent call today: DLT and counsel sign-off are missing, and logs the refusal as voice_ai", async () => {
    as("Employee");
    const res = await POST(req(), params("l1"));
    expect(res.status).toBe(409);
    expect((await res.json()).reasons).toEqual(["dlt_registration_missing", "counsel_sign_off_missing"]);
    expect(calls.recorded).toEqual([expect.objectContaining({ leadId: "l1", decision: "refused", channel: "voice_ai" })]);
    expect(calls.created).toEqual([]);
    expect(calls.started).toEqual([]);
  });

  it("once registrations are recorded, starts the job and logs an allowed voice_ai attempt", async () => {
    Object.assign(CURRENT_REGISTRATIONS, { dltIndia: true, counselSignedOff: true });
    as("Employee");
    const res = await POST(req(), params("l1"));
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ jobId: "job-1", status: "calling" });
    expect(calls.started).toEqual([expect.objectContaining({ jobId: "job-1", leadId: "l1", organizationId: "org-1", phoneE164: "+919876543210", country: "IN" })]);
    expect(calls.recorded).toEqual([expect.objectContaining({ decision: "allowed", channel: "voice_ai", outcome: null })]);
    expect(calls.statuses).toEqual([{ jobId: "job-1", status: "calling" }]);
  });

  it("marks the job failed and logs no attempt when Callismatic cannot place the call", async () => {
    Object.assign(CURRENT_REGISTRATIONS, { dltIndia: true, counselSignedOff: true });
    state.start = { ok: false, reason: "provider_unavailable" };
    as("Manager");
    const res = await POST(req(), params("l1"));
    expect(res.status).toBe(502);
    expect((await res.json()).failureReason).toBe("provider_unavailable");
    expect(calls.statuses).toEqual([{ jobId: "job-1", status: "failed", failureReason: "provider_unavailable" }]);
    expect(calls.recorded).toEqual([]);
  });

  it("answers 503 without creating a job when Callismatic is not configured", async () => {
    Object.assign(CURRENT_REGISTRATIONS, { dltIndia: true, counselSignedOff: true });
    state.configured = false;
    as("Manager");
    const res = await POST(req(), params("l1"));
    expect(res.status).toBe(503);
    expect(calls.created).toEqual([]);
  });

  it("respects a voice_ai suppression", async () => {
    Object.assign(CURRENT_REGISTRATIONS, { dltIndia: true, counselSignedOff: true });
    suppressedAi = new Set(["+919876543210"]);
    as("Manager");
    const res = await POST(req(), params("l1"));
    expect(res.status).toBe(409);
    expect((await res.json()).reasons).toContain("suppressed");
  });

  it("hides another owner's lead from an Employee", async () => {
    as("Employee");
    expect((await POST(req(), params("l2"))).status).toBe(404);
    expect((await GET(req(), params("l2"))).status).toBe(404);
  });

  it("returns the latest job for a lead", async () => {
    as("Employee");
    const res = await GET(req(), params("l1"));
    expect((await res.json()).job).toEqual(expect.objectContaining({ id: "job-1", status: "completed", outcome: "interested" }));
  });
});
