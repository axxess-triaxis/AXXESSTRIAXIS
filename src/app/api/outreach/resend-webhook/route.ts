import { NextResponse } from "next/server";
import { addSuppression, findOrganizationForMessage, recordEmailEvent } from "../../../../repositories/outboundRepository";
import { handleInboundReply, parseReceivedEvent } from "../../../../services/outbound/replyIntake";
import { parseDeliveryEvent, parseSuppressionEvent, verifyWebhookSignature } from "../../../../services/outbound/resendWebhook";

// Resend webhook for outreach email (GTM plan 2026-11-11). Point a Resend webhook at this URL for
// the email.bounced and email.complained events and put its signing secret in
// OUTREACH_RESEND_WEBHOOK_SECRET. A bounce suppresses email; a complaint suppresses every channel.
// Events for messages that were not outreach sends (for example invitations) are acknowledged and ignored.
// Day 3: email.received for OUTREACH_REPLY_TO is a reply to outreach. It is sorted, applied to the
// lead, stored in lead_replies, and forwarded to OUTREACH_FORWARD_TO (see services/outbound/replyIntake.ts).
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
  const received = parseReceivedEvent(payload);
  if (received) {
    const organizationId = process.env.OUTREACH_ORGANIZATION_ID;
    const resendApiKey = process.env.OUTREACH_RESEND_API_KEY;
    const replyTo = process.env.OUTREACH_REPLY_TO;
    const forwardFrom = process.env.OUTREACH_FROM;
    if (!organizationId || !resendApiKey || !replyTo || !forwardFrom) return NextResponse.json({ ignored: "reply_intake_not_configured" });
    const result = await handleInboundReply(received, {
      organizationId, resendApiKey, replyTo, forwardFrom, forwardTo: process.env.OUTREACH_FORWARD_TO || null,
    });
    return NextResponse.json(result);
  }

  // Day 4: delivered, bounced and complained events are recorded per message (funnel and ramp rule).
  const delivery = parseDeliveryEvent(payload);
  if (!delivery) return NextResponse.json({ ignored: "not_a_delivery_event" });

  const organizationId = await findOrganizationForMessage(delivery.messageId);
  if (!organizationId) return NextResponse.json({ ignored: "not_an_outreach_message" });
  await recordEmailEvent({ organizationId, providerMessageId: delivery.messageId, type: delivery.type, recipient: delivery.recipient });

  const event = parseSuppressionEvent(payload);
  if (!event) return NextResponse.json({ recorded: delivery.type });

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
