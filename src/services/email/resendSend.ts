// Minimal Resend sender for outreach email. Throws on failure so the caller leaves the step due.
import type { OutgoingEmail } from "../outbound/outreachTick";

export async function sendViaResend(apiKey: string, email: OutgoingEmail, idempotencyKey: string): Promise<{ id: string }> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({
      from: email.from,
      to: email.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
      headers: email.headers,
      reply_to: process.env.OUTREACH_REPLY_TO || undefined,
    }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as { id?: string; message?: string; name?: string };
  if (!response.ok || !payload.id) {
    console.error("[outreach] Resend send failed", { status: response.status, name: payload.name, message: payload.message });
    throw new Error(`Resend send failed with ${response.status}`);
  }
  return { id: payload.id };
}
