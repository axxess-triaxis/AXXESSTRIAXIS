// Resend webhook handling for outreach (GTM plan 2026-11-11). Resend signs webhooks the Svix way:
// HMAC-SHA256 over "<svix-id>.<svix-timestamp>.<raw body>" with the base64 key after "whsec_",
// sent as one or more space-separated "v1,<base64>" values. Bounces and complaints become
// suppressions so the address is never emailed again.
import { createHmac, timingSafeEqual } from "node:crypto";

const TOLERANCE_SECONDS = 300;

export type WebhookHeaders = { id: string | null; timestamp: string | null; signature: string | null };

export function verifyWebhookSignature(secret: string, headers: WebhookHeaders, rawBody: string, now: Date): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature || !secret.startsWith("whsec_")) return false;
  const ts = Number(timestamp);
  if (!Number.isInteger(ts) || Math.abs(Math.floor(now.getTime() / 1000) - ts) > TOLERANCE_SECONDS) return false;

  const key = Buffer.from(secret.slice("whsec_".length), "base64");
  const expected = Buffer.from(createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest("base64"));
  return signature.split(" ").some((part) => {
    const [version, value] = part.split(",", 2);
    if (version !== "v1" || !value) return false;
    const given = Buffer.from(value);
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

export type DeliveryEvent = { messageId: string; type: "delivered" | "bounced" | "complained"; recipient: string | null };

/** Day 4: delivered, bounced and complained events, recorded per message for the funnel and the ramp rule. */
export function parseDeliveryEvent(payload: unknown): DeliveryEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const { type, data } = payload as { type?: unknown; data?: { email_id?: unknown; to?: unknown } };
  const kind = type === "email.delivered" ? "delivered" : type === "email.bounced" ? "bounced" : type === "email.complained" ? "complained" : null;
  if (!kind || !data || typeof data.email_id !== "string") return null;
  const first = Array.isArray(data.to) ? data.to.find((r): r is string => typeof r === "string" && r.includes("@")) : undefined;
  return { messageId: data.email_id, type: kind, recipient: first ? first.trim().toLowerCase() : null };
}

export type SuppressionEvent = { messageId: string; recipients: string[]; reason: "bounce" | "complaint" };

export function parseSuppressionEvent(payload: unknown): SuppressionEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const { type, data } = payload as { type?: unknown; data?: { email_id?: unknown; to?: unknown } };
  const reason = type === "email.bounced" ? "bounce" : type === "email.complained" ? "complaint" : null;
  if (!reason || !data || typeof data.email_id !== "string" || !Array.isArray(data.to)) return null;
  const recipients = data.to.filter((r): r is string => typeof r === "string" && r.includes("@")).map((r) => r.trim().toLowerCase());
  if (recipients.length === 0) return null;
  return { messageId: data.email_id, recipients, reason };
}
