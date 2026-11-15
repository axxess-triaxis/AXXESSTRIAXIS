import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseSuppressionEvent, verifyWebhookSignature } from "./resendWebhook";

// Svix-style secret: "whsec_" + base64 key. Test-only placeholder.
const KEY = Buffer.from("k".repeat(32));
const SECRET = `whsec_${KEY.toString("base64")}`;
const NOW = new Date("2026-11-12T08:00:00Z");
const TS = String(Math.floor(NOW.getTime() / 1000));

function sign(id: string, ts: string, body: string, key = KEY) {
  return `v1,${createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64")}`;
}

describe("verifyWebhookSignature", () => {
  const body = JSON.stringify({ type: "email.bounced" });

  it("accepts a correct signature within five minutes", () => {
    expect(verifyWebhookSignature(SECRET, { id: "msg_1", timestamp: TS, signature: sign("msg_1", TS, body) }, body, NOW)).toBe(true);
  });

  it("accepts when any of several space-separated signatures matches", () => {
    const signature = `v1,AAAA ${sign("msg_1", TS, body)}`;
    expect(verifyWebhookSignature(SECRET, { id: "msg_1", timestamp: TS, signature }, body, NOW)).toBe(true);
  });

  it("rejects a tampered body, a wrong key, missing headers, and old or future timestamps", () => {
    const good = sign("msg_1", TS, body);
    expect(verifyWebhookSignature(SECRET, { id: "msg_1", timestamp: TS, signature: good }, `${body} `, NOW)).toBe(false);
    expect(verifyWebhookSignature(SECRET, { id: "msg_1", timestamp: TS, signature: sign("msg_1", TS, body, Buffer.from("z".repeat(32))) }, body, NOW)).toBe(false);
    expect(verifyWebhookSignature(SECRET, { id: null, timestamp: TS, signature: good }, body, NOW)).toBe(false);
    const old = String(Number(TS) - 301);
    expect(verifyWebhookSignature(SECRET, { id: "msg_1", timestamp: old, signature: sign("msg_1", old, body) }, body, NOW)).toBe(false);
    const future = String(Number(TS) + 301);
    expect(verifyWebhookSignature(SECRET, { id: "msg_1", timestamp: future, signature: sign("msg_1", future, body) }, body, NOW)).toBe(false);
  });
});

describe("parseSuppressionEvent", () => {
  it("maps bounces and complaints to suppressions for each recipient", () => {
    expect(parseSuppressionEvent({ type: "email.bounced", data: { email_id: "e1", to: ["Ravi@Acme.in"] } }))
      .toEqual({ messageId: "e1", recipients: ["ravi@acme.in"], reason: "bounce" });
    expect(parseSuppressionEvent({ type: "email.complained", data: { email_id: "e2", to: ["a@b.in", "c@d.in"] } }))
      .toEqual({ messageId: "e2", recipients: ["a@b.in", "c@d.in"], reason: "complaint" });
  });

  it("ignores other events and malformed payloads", () => {
    expect(parseSuppressionEvent({ type: "email.delivered", data: { email_id: "e1", to: ["a@b.in"] } })).toBeNull();
    expect(parseSuppressionEvent({ type: "email.bounced", data: { to: ["a@b.in"] } })).toBeNull();
    expect(parseSuppressionEvent({ type: "email.bounced", data: { email_id: "e1", to: [] } })).toBeNull();
    expect(parseSuppressionEvent(null)).toBeNull();
  });
});
