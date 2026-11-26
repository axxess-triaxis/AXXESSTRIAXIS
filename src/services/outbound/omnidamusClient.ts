// Hands a "Message with agent" job to Omnidamus (customer-fireable stack, PR 5, 2026-11-20).
// Omnidamus opens the conversation from the organization's own number and reports the result through
// STILL (conversation.completed.v1 with job_id -> POST /api/stack/results). OMNIDAMUS_START_URL (the
// Function URL, ending in "/") and OMNIDAMUS_START_API_KEY are server-only; without them nothing is sent.
import type { MessageChannel } from "../stack/agentSettings";

export type AgentMessageRequest = {
  jobId: string;
  organizationId: string;
  phoneE164: string;
  channel: MessageChannel;
  /** The organization's own number on this channel: Omnidamus keeps its conversations apart by it. */
  line: string;
  context: string;
  smsOriginationIdentity?: string;
  smsOpeningText?: string;
  whatsappPhoneNumberId?: string;
  whatsappTemplate?: string;
  whatsappTemplateParams?: string[];
};

export type StartAgentMessageResult = { ok: true } | { ok: false; reason: string };

export function isOmnidamusConfigured(): boolean {
  return Boolean(process.env.OMNIDAMUS_START_URL && process.env.OMNIDAMUS_START_API_KEY);
}

const REASON_PATTERN = /^[a-z_]{1,40}$/;

export async function startAgentMessage(request: AgentMessageRequest, fetchImpl: typeof fetch = fetch): Promise<StartAgentMessageResult> {
  const base = process.env.OMNIDAMUS_START_URL;
  const key = process.env.OMNIDAMUS_START_API_KEY;
  if (!base || !key) return { ok: false, reason: "not_configured" };

  const body: Record<string, unknown> = {
    organization_id: request.organizationId,
    job_id: request.jobId,
    line: request.line,
    phone: request.phoneE164,
    context: request.context.slice(0, 2000),
  };
  if (request.channel === "sms") {
    Object.assign(body, { channel: "sms_rcs", notification: request.smsOpeningText, sms_origination_identity: request.smsOriginationIdentity });
  } else {
    Object.assign(body, {
      channel: "whatsapp", template: request.whatsappTemplate, template_params: request.whatsappTemplateParams ?? [],
      whatsapp_origination_id: request.whatsappPhoneNumberId,
    });
  }

  let response: Response;
  try {
    response = await fetchImpl(`${base.replace(/\/+$/, "")}/start`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return { ok: false, reason: "omnidamus_unreachable" };
  }
  if (response.status === 202) return { ok: true };
  const reply = (await response.json().catch(() => null)) as { error?: unknown } | null;
  const reason = typeof reply?.error === "string" && REASON_PATTERN.test(reply.error) ? reply.error : `http_${response.status}`;
  return { ok: false, reason };
}
