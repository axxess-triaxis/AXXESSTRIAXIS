// Resend inbound email (GTM plan 2026-11-11, Day 3 item 1). The email.received webhook carries
// metadata only; the body comes from GET /emails/receiving/{id}. Forwarding is an ordinary send.

export type ReceivedEmail = { from: string; to: string[]; subject: string; text: string; html: string; headers: Record<string, string> };

/** "Asha <asha@acme.in>" or "asha@acme.in" to "asha@acme.in"; null if there is no address. */
// Linear scan, no backtracking regex: the value comes from outside senders (CodeQL js/polynomial-redos).
export function emailAddress(value: string): string | null {
  const input = value.slice(0, 1000);
  const open = input.lastIndexOf("<");
  const close = open >= 0 ? input.indexOf(">", open) : -1;
  const candidates = open >= 0 && close > open ? [input.slice(open + 1, close)] : input.split(/[\s<>",;]/);
  const address = candidates.map((c) => c.trim()).find((c) => isPlainAddress(c));
  return address ? address.toLowerCase() : null;
}

function isPlainAddress(candidate: string): boolean {
  if (candidate.length < 3 || candidate.length > 320) return false;
  const at = candidate.indexOf("@");
  if (at <= 0 || at !== candidate.lastIndexOf("@") || at === candidate.length - 1) return false;
  for (const ch of candidate) if (ch === "<" || ch === ">" || ch === "\"" || ch === "," || ch === ";" || ch.trim() === "") return false;
  return true;
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

/**
 * Rough plain text from HTML when a reply has no text part. The result is only classified, stored
 * and sent as text, never rendered as HTML. Tags are removed by a single scan (so no fragment can
 * re-form a tag), any stray angle brackets are dropped, and entities are decoded in one pass so
 * "&amp;lt;" becomes "&lt;", not "<" (CodeQL js/incomplete-multi-character-sanitization, js/double-escaping).
 */
const ENTITIES: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&quot;": "\"", "&#39;": "'", "&lt;": "", "&gt;": "" };

export function htmlToText(html: string): string {
  let out = "";
  let inTag = false;
  let tag = "";
  let skipUntil: string | null = null; // inside <script> or <style>: drop text until its closing tag
  for (const ch of html) {
    if (inTag) {
      if (ch === ">") {
        inTag = false;
        const name = tag.trim().toLowerCase().split(/[\s/]/).filter(Boolean)[0] ?? "";
        const closing = tag.trim().startsWith("/");
        if (skipUntil) { if (closing && name === skipUntil) skipUntil = null; }
        else if (!closing && (name === "script" || name === "style")) skipUntil = name;
        else if (name === "br" || (closing && ["p", "div", "li", "tr"].includes(name))) out += "\n";
      } else tag += ch;
    } else if (ch === "<") {
      inTag = true;
      tag = "";
    } else if (ch !== ">" && !skipUntil) out += ch;
  }
  return out
    .replace(/&(?:nbsp|amp|quot|#39|lt|gt);/g, (entity) => ENTITIES[entity] ?? "")
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
