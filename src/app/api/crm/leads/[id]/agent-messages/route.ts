import { NextResponse } from "next/server";
import { checkContactability } from "../../../../../../compliance/contactability";
import {
  createMessageJob, latestMessageJob, loadAgentSettings, loadMessageContext, recordMessageAttempt, setMessageJobStatus,
} from "../../../../../../repositories/orgAgentSettingsRepository";
import { isOmnidamusConfigured, startAgentMessage } from "../../../../../../services/outbound/omnidamusClient";
import {
  isPlatformOperatorOrganization, messageReadiness, registrationsOf, type MessageChannel,
} from "../../../../../../services/stack/agentSettings";
import { loadVisibleLead, requireCrmAccess } from "../../../leadAccess";

// Message with agent (customer-fireable stack, PR 5, 2026-11-20): one click asks Omnidamus to open a
// WhatsApp or SMS conversation with the lead from this organization's own number. In order:
// 1. the organization's setup (Omnidamus on, number linked, template or opening SMS), so a message
//    that could never be sent logs nothing;
// 2. the contactability gate for the channel, with this organization's registrations; a refusal is
//    logged like a call's;
// 3. a job row, then Omnidamus. The attempt counts only once Omnidamus accepts it.
// Triaxis's own organization messages from Triaxis's numbers through Omnidamus's existing path, which
// this route does not use: Omnidamus refuses an organization start on a Triaxis number.
const CHANNELS: MessageChannel[] = ["whatsapp", "sms"];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireCrmAccess("/api/crm/leads/[id]/agent-messages", "POST");
  if (access instanceof NextResponse) return access;

  const body = (await request.json().catch(() => ({}))) as { channel?: unknown };
  const channel = CHANNELS.find((c) => c === body.channel);
  if (!channel) return NextResponse.json({ error: "Choose whatsapp or sms." }, { status: 400 });

  const lead = await loadVisibleLead(access, id);
  if (lead instanceof NextResponse) return lead;

  const organizationId = access.scope.organizationId;
  if (isPlatformOperatorOrganization(organizationId)) {
    return NextResponse.json({ error: "Triaxis messages leads from its own numbers, not through this button.", setup: ["triaxis_uses_its_own_numbers"] }, { status: 409 });
  }
  const settings = await loadAgentSettings(organizationId);
  const notReady = messageReadiness(settings, channel);
  if (notReady.length) {
    return NextResponse.json({ error: "Agent messages are not set up for this organization.", setup: notReady }, { status: 409 });
  }
  if (!lead.phoneE164) return NextResponse.json({ error: "The lead has no phone number.", reasons: ["no_phone_number"] }, { status: 409 });

  const now = new Date();
  const context = await loadMessageContext(access.scope, id, lead.phoneE164, channel, now);
  const decision = checkContactability({
    channel,
    country: lead.country ?? "",
    consentBasis: lead.consentBasis,
    suppressed: context.suppressed,
    registry: { status: lead.registryStatus, checkedAt: lead.registryCheckedAt },
    recentAttempts: context.attempts,
    registrations: registrationsOf(settings),
    now,
  });
  if (!decision.allowed) {
    await recordMessageAttempt(access.scope, { leadId: id, channel, decision: "refused", reasons: decision.reasons });
    return NextResponse.json({ error: "The contactability gate refuses this message.", reasons: decision.reasons }, { status: 409 });
  }
  if (!isOmnidamusConfigured()) return NextResponse.json({ error: "Agent messages are not configured." }, { status: 503 });

  const job = await createMessageJob(access.scope, id, channel);
  const started = await startAgentMessage({
    jobId: job.id, organizationId, phoneE164: lead.phoneE164, channel,
    line: (channel === "whatsapp" ? settings.whatsappNumberE164 : settings.smsNumberE164) ?? "",
    context: [settings.callPurpose, `Lead: ${lead.title}`].filter(Boolean).join("\n"),
    smsOriginationIdentity: settings.smsOriginationIdentity ?? undefined,
    smsOpeningText: settings.smsOpeningText ?? undefined,
    whatsappPhoneNumberId: settings.whatsappPhoneNumberId ?? undefined,
    whatsappTemplate: settings.whatsappTemplate ?? undefined,
  });
  if (!started.ok) {
    await setMessageJobStatus(access.scope, job.id, { status: "failed", failureReason: started.reason });
    return NextResponse.json({ error: "The agent could not start this conversation.", jobId: job.id, status: "failed", failureReason: started.reason }, { status: 502 });
  }

  await recordMessageAttempt(access.scope, { leadId: id, channel, decision: "allowed", reasons: [] });
  await setMessageJobStatus(access.scope, job.id, { status: "running" });
  return NextResponse.json({ jobId: job.id, status: "running" }, { status: 202 });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireCrmAccess("/api/crm/leads/[id]/agent-messages", "GET");
  if (access instanceof NextResponse) return access;

  const lead = await loadVisibleLead(access, id);
  if (lead instanceof NextResponse) return lead;

  return NextResponse.json({ job: await latestMessageJob(access.scope, id) });
}
