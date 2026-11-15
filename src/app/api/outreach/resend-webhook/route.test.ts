import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const added: Array<{ organizationId: string; identifier: string; channel: string | null; reason: string }> = [];
const events: Array<{ organizationId: string; providerMessageId: string; type: string; recipient: string | null }> = [];
let org: string | null = "org-1";
vi.mock("../../../../repositories/outboundRepository", () => ({
  findOrganizationForMessage: async () => org,
  addSuppression: async (e: { organizationId: string; identifier: string; channel: string | null; reason: string }) => { added.push(e); },
  recordEmailEvent: async (e: { organizationId: string; providerMessageId: string; type: string; recipient: string | null }) => { events.push(e); },
}));

import { POST } from "./route";

const KEY = Buffer.from("k".repeat(32));
const SECRET = `whsec_${KEY.toString("base64")}`;

function request(payload: unknown, opts: { badSig?: boolean } = {}) {
  const body = JSON.stringify(payload);
  const id = "msg_1";
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", opts.badSig ? Buffer.from("z".repeat(32)) : KEY).update(`${id}.${ts}.${body}`).digest("base64");
  return new Request("http://localhost/api/outreach/resend-webhook", {
    method: "POST", body, headers: { "svix-id": id, "svix-timestamp": ts, "svix-signature": `v1,${sig}` },
  });
}

describe("POST /api/outreach/resend-webhook", () => {
  beforeEach(() => { process.env.OUTREACH_RESEND_WEBHOOK_SECRET = SECRET; });
  afterEach(() => { delete process.env.OUTREACH_RESEND_WEBHOOK_SECRET; added.length = 0; events.length = 0; org = "org-1"; });

  it("suppresses email for a bounced outreach recipient", async () => {
    const response = await POST(request({ type: "email.bounced", data: { email_id: "e1", to: ["Ravi@acme.in"] } }));
    expect(response.status).toBe(200);
    expect(added).toEqual([{ organizationId: "org-1", identifier: "ravi@acme.in", channel: "email", reason: "bounce" }]);
  });

  it("records delivered, bounced and complained events for outreach messages", async () => {
    expect(await (await POST(request({ type: "email.delivered", data: { email_id: "e1", to: ["Ravi@acme.in"] } }))).json()).toEqual({ recorded: "delivered" });
    await POST(request({ type: "email.bounced", data: { email_id: "e2", to: ["a@b.in"] } }));
    await POST(request({ type: "email.complained", data: { email_id: "e3", to: ["c@d.in"] } }));
    expect(events).toEqual([
      { organizationId: "org-1", providerMessageId: "e1", type: "delivered", recipient: "ravi@acme.in" },
      { organizationId: "org-1", providerMessageId: "e2", type: "bounced", recipient: "a@b.in" },
      { organizationId: "org-1", providerMessageId: "e3", type: "complained", recipient: "c@d.in" },
    ]);
    expect(added.map((a) => a.identifier)).toEqual(["a@b.in", "c@d.in"]);
  });

  it("suppresses every channel for a spam complaint", async () => {
    await POST(request({ type: "email.complained", data: { email_id: "e1", to: ["ravi@acme.in"] } }));
    expect(added).toEqual([{ organizationId: "org-1", identifier: "ravi@acme.in", channel: null, reason: "complaint" }]);
  });

  it("rejects a bad signature without writing", async () => {
    expect((await POST(request({ type: "email.bounced", data: { email_id: "e1", to: ["a@b.in"] } }, { badSig: true }))).status).toBe(401);
    expect(added).toEqual([]);
  });

  it("acknowledges other events and non-outreach messages without writing", async () => {
    expect((await POST(request({ type: "email.opened", data: { email_id: "e1", to: ["a@b.in"] } }))).status).toBe(200);
    org = null;
    expect((await POST(request({ type: "email.bounced", data: { email_id: "inv-1", to: ["a@b.in"] } }))).status).toBe(200);
    expect(added).toEqual([]);
    expect(events).toEqual([]);
  });

  it("returns 503 when the webhook secret is not configured", async () => {
    delete process.env.OUTREACH_RESEND_WEBHOOK_SECRET;
    expect((await POST(request({ type: "email.bounced", data: { email_id: "e1", to: ["a@b.in"] } }))).status).toBe(503);
  });
});
