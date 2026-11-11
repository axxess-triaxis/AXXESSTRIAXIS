// Outreach email rendering and unsubscribe tokens (GTM plan 2026-11-11, Day 2).
// Every outreach email identifies the sender and their postal address and carries a working
// unsubscribe link plus RFC 8058 one-click headers. Templates may only use the merge fields below;
// a missing value refuses the render instead of sending "Hi ," to a prospect.
import { createHmac, timingSafeEqual } from "node:crypto";

export type UnsubscribePayload = { organizationId: string; identifier: string };

function sign(secret: string, payload: string) {
  if (secret.length < 32) throw new Error("Unsubscribe secret must be at least 32 characters.");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** No expiry on purpose: an unsubscribe link must keep working for as long as the email exists. */
export function createUnsubscribeToken(secret: string, payload: UnsubscribePayload): string {
  const body = Buffer.from(JSON.stringify({ o: payload.organizationId, i: payload.identifier })).toString("base64url");
  return `${body}.${sign(secret, body)}`;
}

export function verifyUnsubscribeToken(secret: string, token: string): UnsubscribePayload | null {
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra !== undefined) return null;
  const expected = Buffer.from(sign(secret, body));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { o?: unknown; i?: unknown };
    if (typeof parsed.o !== "string" || typeof parsed.i !== "string") return null;
    return { organizationId: parsed.o, identifier: parsed.i };
  } catch {
    return null;
  }
}

export type OutreachTemplate = { subject: string; body: string };
export type OutreachSender = { name: string; company: string; postalAddress: string };
export type OutreachLead = { contactName?: string; organizationName?: string };

const MERGE_FIELDS = {
  first_name: (lead: OutreachLead) => lead.contactName?.trim().split(/\s+/)[0],
  full_name: (lead: OutreachLead) => lead.contactName?.trim(),
  company: (lead: OutreachLead) => lead.organizationName?.trim(),
} as const;

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fill(text: string, lead: OutreachLead) {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, field: string) => {
    if (!(field in MERGE_FIELDS)) throw new Error(`Template uses an unknown merge field: ${field}.`);
    const value = MERGE_FIELDS[field as keyof typeof MERGE_FIELDS](lead);
    if (!value) throw new Error(`Lead has no value for ${field}.`);
    return value;
  });
}

export function renderOutreachEmail(input: {
  template: OutreachTemplate;
  lead: OutreachLead;
  sender: OutreachSender;
  unsubscribeUrl: string;
}) {
  const { sender, unsubscribeUrl } = input;
  const subject = fill(input.template.subject, input.lead).replace(/[\r\n]+/g, " ");
  const body = fill(input.template.body, input.lead);
  const footer = [
    `${sender.name}, ${sender.company}`,
    sender.postalAddress,
    `Not relevant? Unsubscribe: ${unsubscribeUrl}`,
  ];
  const text = [body, "--", ...footer].join("\n\n");
  const paragraphs = body.split(/\n{2,}/).map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("");
  const safeUrl = escapeHtml(unsubscribeUrl);
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.55;color:#0F1117">${paragraphs}`
    + `<p style="font-size:12px;color:#5F6B73;margin-top:24px">${escapeHtml(sender.name)}, ${escapeHtml(sender.company)}<br>`
    + `${escapeHtml(sender.postalAddress)}<br>Not relevant? <a href="${safeUrl}">Unsubscribe</a> (${safeUrl})</p></div>`;
  return {
    subject,
    text,
    html,
    headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  };
}
