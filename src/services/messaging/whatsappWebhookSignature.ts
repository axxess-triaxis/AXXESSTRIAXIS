// MC-3 (2026-08-02): verifies Meta's WhatsApp Business Platform webhook signature. Meta signs the
// raw request body with the app secret (META_APP_SECRET -- the same Meta App backing the
// whatsapp_business connector) and sends a single `X-Hub-Signature-256: sha256=<hex>` header, a
// simpler shape than Resend's svix-based multi-header scheme in resendWebhookSignature.ts, but the
// same principle: verify against the raw body BEFORE parsing, using a constant-time comparison.
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyWhatsAppWebhookSignature(rawBody: string, headers: Headers, secret = process.env.META_APP_SECRET) {
  if (!secret) return false;
  const header = headers.get("x-hub-signature-256");
  if (!header?.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = header.slice("sha256=".length);
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}
