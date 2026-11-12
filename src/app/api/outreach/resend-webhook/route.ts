import { NextResponse } from "next/server";
import { addSuppression, findOrganizationForMessage } from "../../../../repositories/outboundRepository";
import { parseSuppressionEvent, verifyWebhookSignature } from "../../../../services/outbound/resendWebhook";

// Resend webhook for outreach email (GTM plan 2026-11-11). Point a Resend webhook at this URL for
// the email.bounced and email.complained events and put its signing secret in
// OUTREACH_RESEND_WEBHOOK_SECRET. A bounce suppresses email; a complaint suppresses every channel.
// Events for messages that were not outreach sends (for example invitations) are acknowledged and ignored.
export async function POST(request: Request) {
  const secret = process.env.OUTREACH_RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });

  const rawBody = await request.text();
  const headers = {
    id: request.headers.get("svix-id"),
    timestamp: request.headers.get("svix-timestamp"),
    signature: request.headers.get("svix-signature"),
  };
  if (!verifyWebhookSignature(secret, headers, rawBody, new Date())) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: unknown;
  try { payload = JSON.parse(rawBody); } catch { return NextResponse.json({ ignored: "invalid_json" }); }
  const event = parseSuppressionEvent(payload);
  if (!event) return NextResponse.json({ ignored: "not_a_suppression_event" });

  const organizationId = await findOrganizationForMessage(event.messageId);
  if (!organizationId) return NextResponse.json({ ignored: "not_an_outreach_message" });

  for (const identifier of event.recipients) {
    await addSuppression({
      organizationId,
      identifier,
      channel: event.reason === "complaint" ? null : "email",
      reason: event.reason,
    });
  }
  return NextResponse.json({ suppressed: event.recipients.length, reason: event.reason });
}
