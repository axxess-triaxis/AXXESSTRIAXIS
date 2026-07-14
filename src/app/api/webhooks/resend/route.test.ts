import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { verifyResendWebhookSignature } from "../../../../services/email/resendWebhookSignature";

const routeSource = readFileSync(join(process.cwd(), "src", "app", "api", "webhooks", "resend", "route.ts"), "utf8");

function signedHeaders(rawBody: string, secret: string, timestamp = Math.floor(Date.now() / 1000).toString()) {
  const svixId = "msg_123";
  const signature = createHmac("sha256", Buffer.from(secret)).update(`${svixId}.${timestamp}.${rawBody}`).digest("base64");
  return new Headers({
    "svix-id": svixId,
    "svix-timestamp": timestamp,
    "svix-signature": `v1,${signature}`,
  });
}

describe("Resend invitation delivery webhook", () => {
  it("verifies signed webhook payloads", () => {
    const rawBody = JSON.stringify({ type: "email.delivered", data: { tags: { organization_id: "org_1" } } });
    const secret = "webhook_secret";

    expect(verifyResendWebhookSignature(rawBody, signedHeaders(rawBody, secret), secret)).toBe(true);
    expect(verifyResendWebhookSignature(`${rawBody} `, signedHeaders(rawBody, secret), secret)).toBe(false);
  });

  it("rejects stale webhook timestamps", () => {
    const rawBody = "{}";
    const staleTimestamp = Math.floor((Date.now() - 1000 * 60 * 10) / 1000).toString();

    expect(verifyResendWebhookSignature(rawBody, signedHeaders(rawBody, "webhook_secret", staleTimestamp), "webhook_secret")).toBe(false);
  });

  it("stores delivery events without raw recipient email", () => {
    expect(routeSource).toContain("invitation_delivery_events");
    expect(routeSource).toContain("recipient_email_hash");
    expect(routeSource).toContain("organization_id");
    expect(routeSource).not.toContain("recipient_email:");
  });
});
