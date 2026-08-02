// MC-3 (2026-08-02): WhatsApp Business Platform webhook receiver. GET handles Meta's one-time
// subscription verification handshake; POST receives real message/status/call events. Mirrors
// webhooks/resend/route.ts's shape (raw-body signature verify, then service-role insert), adapted
// for Meta's payload structure and its app-level (not per-tenant) webhook subscription model -- see
// findWhatsAppConnectionByPhoneNumberId's comment for how tenant attribution is resolved.
import { NextResponse } from "next/server";
import { findWhatsAppConnectionByPhoneNumberId, recordWhatsAppBusinessEvent } from "../../../../repositories/whatsappEventsRepository";
import { verifyWhatsAppWebhookSignature } from "../../../../services/messaging/whatsappWebhookSignature";
import type { WhatsAppEventType, WhatsAppMessageStatus } from "../../../../domain";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const verifyToken = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && verifyToken && verifyToken === process.env.META_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed." }, { status: 403 });
}

type WhatsAppWebhookMessage = {
  id?: string;
  from?: string;
  type?: string;
  timestamp?: string;
};

type WhatsAppWebhookStatus = {
  id?: string;
  status?: string;
  recipient_id?: string;
  timestamp?: string;
};

type WhatsAppWebhookChangeValue = {
  metadata?: { phone_number_id?: string; display_phone_number?: string };
  messages?: WhatsAppWebhookMessage[];
  statuses?: WhatsAppWebhookStatus[];
};

type WhatsAppWebhookPayload = {
  entry?: Array<{ changes?: Array<{ value?: WhatsAppWebhookChangeValue; field?: string }> }>;
};

const knownMessageStatuses = new Set(["sent", "delivered", "read", "failed"]);

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyWhatsAppWebhookSignature(rawBody, request.headers)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  let stored = 0;
  let skippedNoTenant = 0;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      const connection = await findWhatsAppConnectionByPhoneNumberId(phoneNumberId);
      if (!connection) {
        skippedNoTenant += (value?.messages?.length ?? 0) + (value?.statuses?.length ?? 0);
        continue;
      }

      for (const message of value?.messages ?? []) {
        const recorded = await recordWhatsAppBusinessEvent({
          organizationId: connection.organizationId,
          connectionId: connection.id,
          eventType: "message_inbound" as WhatsAppEventType,
          wabaPhoneNumberId: phoneNumberId,
          waMessageId: message.id,
          direction: "inbound",
          fromNumber: message.from,
          messageType: message.type,
          messageStatus: "received" as WhatsAppMessageStatus,
          payload: message as unknown as Record<string, unknown>,
        });
        if (recorded) stored += 1;
      }

      for (const status of value?.statuses ?? []) {
        const recorded = await recordWhatsAppBusinessEvent({
          organizationId: connection.organizationId,
          connectionId: connection.id,
          eventType: "message_status" as WhatsAppEventType,
          wabaPhoneNumberId: phoneNumberId,
          waMessageId: status.id,
          direction: "outbound",
          toNumber: status.recipient_id,
          messageStatus: knownMessageStatuses.has(status.status ?? "") ? (status.status as WhatsAppMessageStatus) : undefined,
          payload: status as unknown as Record<string, unknown>,
        });
        if (recorded) stored += 1;
      }
    }
  }

  // Always 200 -- Meta retries on non-2xx, and a skipped-no-tenant event is not a delivery
  // failure, just an event this app can't yet attribute (see findWhatsAppConnectionByPhoneNumberId).
  return NextResponse.json({ received: true, stored, skippedNoTenant });
}
