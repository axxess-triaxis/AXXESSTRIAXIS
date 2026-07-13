import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../../../repositories/supabaseAdmin";
import { verifyResendWebhookSignature } from "../../../../services/email/resendWebhookSignature";

const allowedEventTypes = new Set(["email.delivered", "email.bounced", "email.complained", "email.suppressed"]);

type ResendWebhookTags = Array<{ name?: string; value?: string }> | Record<string, string>;
type ResendWebhookRecipient = string | string[];

type ResendWebhookEvent = {
  type?: string;
  data?: {
    id?: string;
    email_id?: string;
    to?: ResendWebhookRecipient;
    tags?: ResendWebhookTags;
  };
};

function tagValue(tags: ResendWebhookTags | undefined, name: string) {
  if (!tags) return undefined;
  if (Array.isArray(tags)) return tags.find((tag) => tag.name === name)?.value;
  return tags[name];
}

function recipientHash(to: ResendWebhookRecipient | undefined) {
  const recipient = Array.isArray(to) ? to[0] : to;
  return recipient ? createHash("sha256").update(recipient.toLowerCase()).digest("hex") : undefined;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyResendWebhookSignature(rawBody, request.headers)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as ResendWebhookEvent;
  if (!event.type || !allowedEventTypes.has(event.type)) {
    return NextResponse.json({ received: true, stored: false });
  }

  const organizationId = tagValue(event.data?.tags, "organization_id");
  if (!organizationId) return NextResponse.json({ received: true, stored: false, reason: "missing organization tag" });
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase admin runtime is not configured." }, { status: 503 });
  }

  await supabaseAdminRest("invitation_delivery_events", {
    method: "POST",
    body: {
      organization_id: organizationId,
      invitation_id: tagValue(event.data?.tags, "invitation_id") ?? null,
      provider: "resend",
      provider_message_id: event.data?.email_id ?? event.data?.id ?? null,
      recipient_email_hash: recipientHash(event.data?.to) ?? null,
      event_type: event.type.replace(/^email\./, ""),
      raw_event: {
        provider_event_type: event.type,
        provider_message_id: event.data?.email_id ?? event.data?.id ?? null,
      },
    },
  });

  return NextResponse.json({ received: true, stored: true });
}
