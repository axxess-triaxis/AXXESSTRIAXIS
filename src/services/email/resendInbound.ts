// Resend inbound email (GTM plan 2026-11-11, Day 3 item 1). The email.received webhook carries
// metadata only; the body comes from GET /emails/receiving/{id}. Forwarding is an ordinary send.

export type ReceivedEmail = { from: string; to: string[]; subject: string; text: string; html: string; headers: Record<string, string> };

/** "Asha <asha@acme.in>" or "asha@acme.in" to "asha@acme.in"; null if there is no address. */
export function emailAddress(value: string): string | null {
  const match = /<([^<>\s]+@[^<>\s]+)>/.exec(value) ?? /([^\s<>",;]+@[^\s<>",;]+)/.exec(value);
  return match ? match[1].trim().toLowerCase() : null;
}

function normalizeHeaders(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item && typeof item === "object" && typeof (item as { name?: unknown }).name === "string") {
        out[(item as { name: string }).name] = String((item as { value?: unknown }).value ?? "");
      }
    }
  } else if (raw && typeof raw === "object") {
    for (const [key, value] of Object.entries(raw)) out[key] = Array.isArray(value) ? value.join(", ") : String(value ?? "");
  }
  return out;
}

export async function fetchReceivedEmail(apiKey: string, emailId: string): Promise<ReceivedEmail> {
  const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Resend received-email fetch failed with ${response.status}`);
  const body = await response.json() as Record<string, unknown>;
  const to = Array.isArray(body.to) ? body.to.map(String) : typeof body.to === "string" ? [body.to] : [];
  return {
    from: String(body.from ?? ""),
    to,
    subject: String(body.subject ?? ""),
    text: typeof body.text === "string" ? body.text : "",
    html: typeof body.html === "string" ? body.html : "",
    headers: normalizeHeaders(body.headers),
  };
}

/** Rough text from HTML when a reply has no text part. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>|<\/p>|<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function forwardViaResend(apiKey: string, email: {
  from: string; to: string; replyTo: string; subject: string; text: string;
}, idempotencyKey: string): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ from: email.from, to: email.to, reply_to: email.replyTo, subject: email.subject, text: email.text }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Resend forward failed with ${response.status}`);
}
