import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkLead } from "../../../repositories/leadWorkRepository";
import { DEFAULT_AGENT_SETTINGS, type AgentSettings } from "../../../services/stack/agentSettings";

// Message with agent (customer-fireable stack, PR 5, 2026-11-20).
type Session = { user: { id: string; organizationId: string; role: string } };
const state = { session: null as Session | null, start: { ok: true } as { ok: true } | { ok: false; reason: string }, configured: true, suppressed: false };
const calls = {
  attempts: [] as Array<Record<string, unknown>>,
  statuses: [] as Array<Record<string, unknown>>,
  started: [] as Array<Record<string, unknown>>,
  created: [] as string[],
};
let leads: WorkLead[] = [];
const READY: AgentSettings = {
  ...DEFAULT_AGENT_SETTINGS, omnidamusEnabled: true, callPurpose: "Ask about the flat viewing.",
  whatsappPhoneNumberId: "pn-1", whatsappNumberE164: "+971500000001", whatsappTemplate: "viewing_intro",
  smsOriginationIdentity: "SHARMA", smsNumberE164: "+919800000001", smsOpeningText: "Hello from Sharma Realty.",
};
let settings: AgentSettings = READY;

const lead = (over: Partial<WorkLead> = {}): WorkLead => ({
  id: "l1", title: "Acme - Asha", phoneE164: "+971501234567", country: "AE", consentBasis: "opt_in", stage: "new", status: "open",
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
}));
vi.mock("../../../repositories/orgAgentSettingsRepository", () => ({
  loadAgentSettings: async () => settings,
  loadMessageContext: async () => ({ suppressed: state.suppressed, attempts: [] }),
  recordMessageAttempt: async (_s: unknown, a: Record<string, unknown>) => { calls.attempts.push(a); },
  createMessageJob: async (_s: unknown, leadId: string, channel: string) => { calls.created.push(leadId); return { id: "mjob-1", leadId, channel, status: "queued" }; },
  setMessageJobStatus: async (_s: unknown, jobId: string, change: Record<string, unknown>) => { calls.statuses.push({ jobId, ...change }); },
  latestMessageJob: async () => ({ id: "mjob-1", leadId: "l1", channel: "whatsapp", status: "completed", summary: "Viewing booked" }),
}));
vi.mock("../../../services/outbound/omnidamusClient", () => ({
  isOmnidamusConfigured: () => state.configured,
  startAgentMessage: async (r: Record<string, unknown>) => { calls.started.push(r); return state.start; },
}));

import { GET, POST } from "./leads/[id]/agent-messages/route";

const as = (role: string, id = role === "Employee" ? "emp" : "mgr") => { state.session = { user: { id, organizationId: "org-customer", role } }; };
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (channel: unknown = "whatsapp") => new Request("http://localhost/api/crm/leads/l1/agent-messages", {
  method: "POST", body: JSON.stringify({ channel }), headers: { "content-type": "application/json" },
});
const NOON_DUBAI = new Date("2026-11-20T08:00:00Z");

describe("agent message route", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOON_DUBAI);
    vi.stubEnv("AXXESS_PLATFORM_OPERATOR_ORGANIZATION_ID", "org-triaxis");
    leads = [lead(), lead({ id: "l2", ownerUserId: "other" }), lead({ id: "l3", phoneE164: undefined })];
    settings = READY;
    Object.assign(state, { start: { ok: true }, configured: true, suppressed: false });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    for (const list of Object.values(calls)) list.length = 0;
  });

  it("opens a WhatsApp conversation from the organization's own number and logs an allowed attempt", async () => {
    as("Employee");
    const res = await POST(req("whatsapp"), params("l1"));
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ jobId: "mjob-1", status: "running" });
    expect(calls.started).toEqual([expect.objectContaining({
      jobId: "mjob-1", organizationId: "org-customer", phoneE164: "+971501234567", channel: "whatsapp",
      line: "+971500000001", whatsappPhoneNumberId: "pn-1", whatsappTemplate: "viewing_intro",
    })]);
    expect(calls.attempts).toEqual([expect.objectContaining({ channel: "whatsapp", decision: "allowed" })]);
    expect(calls.statuses).toEqual([{ jobId: "mjob-1", status: "running" }]);
  });

  it("an SMS to the UAE needs the organization's TDRA registration and counsel sign-off", async () => {
    as("Manager");
    const res = await POST(req("sms"), params("l1"));
    expect(res.status).toBe(409);
    expect((await res.json()).reasons).toEqual(expect.arrayContaining(["tdra_registration_missing", "counsel_sign_off_missing"]));
    expect(calls.attempts).toEqual([expect.objectContaining({ channel: "sms", decision: "refused" })]);
    expect(calls.started).toEqual([]);
  });

  it("an SMS goes out once the organization's registrations are recorded", async () => {
    settings = { ...READY, tdraUaeRegistered: true, counselSignedOff: true };
    as("Manager");
    expect((await POST(req("sms"), params("l1"))).status).toBe(202);
    expect(calls.started[0]).toEqual(expect.objectContaining({
      channel: "sms", line: "+919800000001", smsOriginationIdentity: "SHARMA", smsOpeningText: "Hello from Sharma Realty.",
    }));
  });

  it("refuses with the setup list, logging nothing, until Triaxis links the number", async () => {
    settings = { ...READY, whatsappNumberE164: null };
    as("Manager");
    const res = await POST(req("whatsapp"), params("l1"));
    expect(res.status).toBe(409);
    expect((await res.json()).setup).toEqual(["whatsapp_not_linked"]);
    expect(calls.attempts).toEqual([]);
    expect(calls.created).toEqual([]);
  });

  it("Triaxis's own organization does not use this button", async () => {
    vi.stubEnv("AXXESS_PLATFORM_OPERATOR_ORGANIZATION_ID", "org-customer");
    as("Manager");
    const res = await POST(req("whatsapp"), params("l1"));
    expect((await res.json()).setup).toEqual(["triaxis_uses_its_own_numbers"]);
    expect(calls.started).toEqual([]);
  });

  it("respects a suppression on the channel", async () => {
    state.suppressed = true;
    as("Manager");
    const res = await POST(req("whatsapp"), params("l1"));
    expect((await res.json()).reasons).toContain("suppressed");
  });

  it("marks the job failed and logs no attempt when Omnidamus refuses", async () => {
    state.start = { ok: false, reason: "start_refused" };
    as("Manager");
    const res = await POST(req("whatsapp"), params("l1"));
    expect(res.status).toBe(502);
    expect(calls.statuses).toEqual([{ jobId: "mjob-1", status: "failed", failureReason: "start_refused" }]);
    expect(calls.attempts).toEqual([]);
  });

  it("answers 503 without a job when Omnidamus is not configured", async () => {
    state.configured = false;
    as("Manager");
    expect((await POST(req("whatsapp"), params("l1"))).status).toBe(503);
    expect(calls.created).toEqual([]);
  });

  it("rejects an unknown channel, a lead without a phone, and another owner's lead", async () => {
    as("Employee");
    expect((await POST(req("email"), params("l1"))).status).toBe(400);
    expect((await POST(req("whatsapp"), params("l2"))).status).toBe(404);
    as("Manager");
    expect((await POST(req("whatsapp"), params("l3"))).status).toBe(409);
  });

  it("returns the latest conversation job", async () => {
    as("Employee");
    expect((await (await GET(req(), params("l1"))).json()).job).toEqual(expect.objectContaining({ id: "mjob-1", status: "completed" }));
  });
});
