import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = {
  stored: [] as Array<Record<string, unknown>>,
  suppressions: [] as Array<Record<string, unknown>>,
  stopped: [] as string[],
  leadPatches: [] as Array<{ leadId: string; patch: Record<string, unknown> }>,
  tasks: [] as Array<Record<string, unknown>>,
  audits: [] as Array<{ action: string; metadata: Record<string, unknown> }>,
  lead: { id: "lead-1", stage: "new", status: "open", ownerUserId: "owner-1" } as { id: string; stage: string; status: string; ownerUserId: string | null } | null,
};
const resend = { email: { from: "Asha <Asha@Acme.in>", to: ["replies@go.example.com"], subject: "Re: Quick question", text: "Sounds good, call me Thursday.", html: "", headers: {} as Record<string, string> }, forwards: [] as Array<Record<string, unknown>> };
let category = "interested";

vi.mock("../../../../repositories/replyRepository", () => ({
  findLeadByEmail: async () => db.lead,
  replyAlreadyStored: async (_org: string, id: string) => db.stored.some((r) => r.providerEmailId === id),
  insertReply: async (r: Record<string, unknown>) => { db.stored.push(r); return true; },
  stopActiveEnrollments: async (_org: string, leadId: string) => { db.stopped.push(leadId); return 1; },
  updateLeadFromReply: async (_org: string, leadId: string, patch: Record<string, unknown>) => { db.leadPatches.push({ leadId, patch }); },
  createOwnerTask: async (_org: string, task: Record<string, unknown>) => { db.tasks.push(task); },
  recordSystemAudit: async (_org: string, entry: { action: string; metadata: Record<string, unknown> }) => { db.audits.push(entry); },
}));
vi.mock("../../../../repositories/outboundRepository", () => ({
  findOrganizationForMessage: async () => "org-1",
  addSuppression: async (e: Record<string, unknown>) => { db.suppressions.push(e); },
}));
vi.mock("../../../../services/email/resendInbound", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchReceivedEmail: async () => resend.email,
  forwardViaResend: async (_key: string, email: Record<string, unknown>) => { resend.forwards.push(email); },
}));
vi.mock("../../../../services/outbound/replyClassifier", async () => {
  const { classifyByRules } = await import("../../../../services/outbound/replySorting");
  return {
    classifyReply: async (reply: { subject: string; text: string; headers: Record<string, string> }) => {
      const byRules = classifyByRules(reply);
      return byRules ? { category: byRules, classifiedBy: "rules" } : { category, classifiedBy: "claude" };
    },
  };
});

import { POST } from "./route";

const KEY = Buffer.from("k".repeat(32));
function request(payload: unknown) {
  const body = JSON.stringify(payload);
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", KEY).update(`msg_1.${ts}.${body}`).digest("base64");
  return new Request("http://localhost/api/outreach/resend-webhook", { method: "POST", body, headers: { "svix-id": "msg_1", "svix-timestamp": ts, "svix-signature": `v1,${sig}` } });
}
const received = (emailId = "in-1", to = ["replies@go.example.com"]) => request({ type: "email.received", data: { email_id: emailId, to } });

describe("POST /api/outreach/resend-webhook (replies)", () => {
  beforeEach(() => {
    Object.assign(process.env, {
      OUTREACH_RESEND_WEBHOOK_SECRET: `whsec_${KEY.toString("base64")}`, OUTREACH_ORGANIZATION_ID: "org-1", OUTREACH_RESEND_API_KEY: "re_test",
      OUTREACH_REPLY_TO: "replies@go.example.com", OUTREACH_FROM: "AXXESS <hello@go.example.com>", OUTREACH_FORWARD_TO: "team@example.com",
    });
  });
  afterEach(() => {
    for (const key of ["OUTREACH_RESEND_WEBHOOK_SECRET", "OUTREACH_ORGANIZATION_ID", "OUTREACH_RESEND_API_KEY", "OUTREACH_REPLY_TO", "OUTREACH_FROM", "OUTREACH_FORWARD_TO"]) delete process.env[key];
    for (const list of [db.stored, db.suppressions, db.stopped, db.leadPatches, db.tasks, db.audits, resend.forwards]) list.length = 0;
    db.lead = { id: "lead-1", stage: "new", status: "open", ownerUserId: "owner-1" };
    resend.email.text = "Sounds good, call me Thursday.";
    category = "interested";
  });

  it("an interested reply stops the sequence, moves the lead, creates a task, stores it and forwards it", async () => {
    const response = await POST(received());
    expect(await response.json()).toMatchObject({ status: "stored", category: "interested", leadId: "lead-1", forwarded: true });
    expect(db.stopped).toEqual(["lead-1"]);
    expect(db.leadPatches[0]).toMatchObject({ leadId: "lead-1", patch: { stage: "qualifying" } });
    expect(db.tasks[0]).toMatchObject({ title: "Reply: interested - call back", assigneeId: "owner-1" });
    expect(db.stored[0]).toMatchObject({ fromEmail: "asha@acme.in", category: "interested", classifiedBy: "claude", leadId: "lead-1" });
    expect(resend.forwards[0]).toMatchObject({ to: "team@example.com", replyTo: "asha@acme.in", subject: "[AXXESS: Interested] Re: Quick question" });
    expect(db.audits.map((a) => a.action)).toEqual(["crm.lead.updated", "outreach.reply.received"]);
  });

  it("processes a retried event once", async () => {
    await POST(received());
    expect(await (await POST(received())).json()).toEqual({ status: "ignored", reason: "duplicate" });
    expect(db.stored).toHaveLength(1);
    expect(db.tasks).toHaveLength(1);
  });

  it("an unsubscribe reply suppresses the address and marks the lead lost, without Claude", async () => {
    resend.email.text = "Unsubscribe";
    expect(await (await POST(received())).json()).toMatchObject({ category: "unsubscribe" });
    expect(db.suppressions).toEqual([{ organizationId: "org-1", identifier: "asha@acme.in", channel: "email", reason: "unsubscribe" }]);
    expect(db.leadPatches[0].patch).toMatchObject({ status: "lost" });
    expect(db.stored[0]).toMatchObject({ classifiedBy: "rules" });
  });

  it("an out-of-office reply keeps the sequence going", async () => {
    resend.email.text = "x";
    category = "out_of_office";
    await POST(received());
    expect(db.stopped).toEqual([]);
    expect(db.tasks).toEqual([]);
  });

  it("an unmatched sender is stored with no lead and still forwarded", async () => {
    db.lead = null;
    category = "other";
    expect(await (await POST(received())).json()).toMatchObject({ status: "stored", leadId: null, forwarded: true });
    expect(db.stored[0]).toMatchObject({ leadId: null });
    expect(db.tasks[0]).toMatchObject({ title: "Reply needs reading", assigneeId: null });
  });

  it("ignores mail to another address", async () => {
    expect(await (await POST(received("in-2", ["someone@go.example.com"]))).json()).toEqual({ status: "ignored", reason: "not_reply_address" });
    expect(db.stored).toEqual([]);
  });

  it("acknowledges without acting when reply intake is not configured", async () => {
    delete process.env.OUTREACH_REPLY_TO;
    expect(await (await POST(received())).json()).toEqual({ ignored: "reply_intake_not_configured" });
    expect(db.stored).toEqual([]);
  });
});
