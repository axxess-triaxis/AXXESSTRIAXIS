import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWhatsAppWebhookSignature } from "./whatsappWebhookSignature";

const SECRET = "test-meta-app-secret";

function signedHeaders(rawBody: string, secret = SECRET) {
  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
  return new Headers({ "x-hub-signature-256": `sha256=${digest}` });
}

describe("verifyWhatsAppWebhookSignature", () => {
  it("accepts a correctly signed payload", () => {
    const rawBody = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    expect(verifyWhatsAppWebhookSignature(rawBody, signedHeaders(rawBody), SECRET)).toBe(true);
  });

  it("rejects a payload signed with the wrong secret", () => {
    const rawBody = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    expect(verifyWhatsAppWebhookSignature(rawBody, signedHeaders(rawBody, "wrong-secret"), SECRET)).toBe(false);
  });

  it("rejects a tampered body signed for different content", () => {
    const original = JSON.stringify({ entry: [{ id: "1" }] });
    const headers = signedHeaders(original);
    const tampered = JSON.stringify({ entry: [{ id: "2" }] });
    expect(verifyWhatsAppWebhookSignature(tampered, headers, SECRET)).toBe(false);
  });

  it("rejects when the signature header is missing or malformed", () => {
    const rawBody = "{}";
    expect(verifyWhatsAppWebhookSignature(rawBody, new Headers(), SECRET)).toBe(false);
    expect(verifyWhatsAppWebhookSignature(rawBody, new Headers({ "x-hub-signature-256": "not-sha256-prefixed" }), SECRET)).toBe(false);
  });

  it("rejects when no secret is configured, rather than skipping verification", () => {
    const rawBody = "{}";
    expect(verifyWhatsAppWebhookSignature(rawBody, signedHeaders(rawBody), undefined)).toBe(false);
  });
});
