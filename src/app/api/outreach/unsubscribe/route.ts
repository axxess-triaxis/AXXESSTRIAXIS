import { addSuppression } from "../../../../repositories/outboundRepository";
import { verifyUnsubscribeToken } from "../../../../services/outbound/outreachEmail";

// Public unsubscribe endpoint for outreach email (GTM plan 2026-11-11, Day 2). No session: the
// HMAC-signed token names the organization and the email address. GET handles a link click,
// POST handles RFC 8058 one-click unsubscribe from mail clients. Both suppress email at once.
function page(status: number, message: string) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title></head>`
    + `<body style="font-family:Arial,sans-serif;max-width:480px;margin:48px auto;padding:0 16px;color:#0F1117"><p>${message}</p></body></html>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

async function handle(request: Request) {
  const secret = process.env.OUTREACH_UNSUBSCRIBE_SECRET;
  if (!secret || secret.length < 32) return page(503, "Unsubscribe is temporarily unavailable. Please reply to the email with \"unsubscribe\".");
  const token = new URL(request.url).searchParams.get("token") ?? "";
  // The HMAC check is the only gate: an empty or forged token verifies to null.
  const payload = verifyUnsubscribeToken(secret, token);
  if (!payload) return page(400, "This unsubscribe link is not valid. Please reply to the email with \"unsubscribe\".");
  await addSuppression({ organizationId: payload.organizationId, identifier: payload.identifier, channel: "email", reason: "unsubscribe" });
  return page(200, "You have been unsubscribed and will not receive further emails from us.");
}

export const GET = handle;
export const POST = handle;
