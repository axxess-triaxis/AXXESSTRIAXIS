// Customer-fireable stack, PR 5 (2026-11-20). Per-organization settings for firing Callismatic
// ("Call with agent") and Omnidamus ("Message with agent"), and what each still needs.
//
// Two owners:
// - The organization's admins choose whether each agent is on, and write their own call purpose and
//   opening SMS.
// - Triaxis, as the platform operator, links the organization's numbers and senders in its AWS
//   account and records DLT (India), TDRA (UAE) and counsel sign-off after seeing proof. A customer
//   can never set these for itself, so it can never call or message as someone else.
import type { Registrations } from "../outbound/callQueue";

export type AgentSettings = {
  callismaticEnabled: boolean;
  omnidamusEnabled: boolean;
  callPurpose: string | null;
  smsOpeningText: string | null;
  callerIdE164: string | null;
  whatsappPhoneNumberId: string | null;
  whatsappNumberE164: string | null;
  whatsappTemplate: string | null;
  smsOriginationIdentity: string | null;
  smsNumberE164: string | null;
  dltIndiaRegistered: boolean;
  tdraUaeRegistered: boolean;
  counselSignedOff: boolean;
  updatedAt: string | null;
};

export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  callismaticEnabled: false, omnidamusEnabled: false, callPurpose: null, smsOpeningText: null,
  callerIdE164: null, whatsappPhoneNumberId: null, whatsappNumberE164: null, whatsappTemplate: null,
  smsOriginationIdentity: null, smsNumberE164: null,
  dltIndiaRegistered: false, tdraUaeRegistered: false, counselSignedOff: false, updatedAt: null,
};

export const ORGANIZATION_FIELDS = ["callismaticEnabled", "omnidamusEnabled", "callPurpose", "smsOpeningText"] as const;
export const OPERATOR_FIELDS = [
  "callerIdE164", "whatsappPhoneNumberId", "whatsappNumberE164", "whatsappTemplate", "smsOriginationIdentity", "smsNumberE164",
  "dltIndiaRegistered", "tdraUaeRegistered", "counselSignedOff",
] as const;

type EditableField = (typeof ORGANIZATION_FIELDS)[number] | (typeof OPERATOR_FIELDS)[number];
export type AgentSettingsPatch = Partial<Pick<AgentSettings, EditableField>>;

const E164 = /^\+[1-9]\d{6,14}$/;
const BOOLEAN_FIELDS = new Set<EditableField>(["callismaticEnabled", "omnidamusEnabled", "dltIndiaRegistered", "tdraUaeRegistered", "counselSignedOff"]);
const TEXT_RULES: Partial<Record<EditableField, (value: string) => boolean>> = {
  callPurpose: (v) => v.length >= 1 && v.length <= 500,
  smsOpeningText: (v) => v.length >= 1 && v.length <= 320,
  callerIdE164: (v) => E164.test(v),
  whatsappNumberE164: (v) => E164.test(v),
  smsNumberE164: (v) => E164.test(v),
  whatsappPhoneNumberId: (v) => /^[A-Za-z0-9_-]{1,80}$/.test(v),
  whatsappTemplate: (v) => /^[a-z0-9_]{1,512}$/.test(v),
  smsOriginationIdentity: (v) => v.length >= 1 && v.length <= 200,
};

export type PatchResult = { ok: true; patch: AgentSettingsPatch } | { ok: false; error: string; field?: string };

/**
 * Validates a settings change. An organization admin may change only ORGANIZATION_FIELDS; the
 * platform operator may change every field. Empty text clears a field.
 */
export function parseAgentSettingsPatch(body: unknown, options: { operator: boolean }): PatchResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "invalid_body" };
  const allowed = new Set<string>(options.operator ? [...ORGANIZATION_FIELDS, ...OPERATOR_FIELDS] : ORGANIZATION_FIELDS);
  const patch: Record<string, unknown> = {};
  for (const [field, raw] of Object.entries(body as Record<string, unknown>)) {
    if (!allowed.has(field)) {
      const known = (OPERATOR_FIELDS as readonly string[]).includes(field);
      return { ok: false, error: known ? "operator_only_field" : "unknown_field", field };
    }
    const key = field as EditableField;
    if (BOOLEAN_FIELDS.has(key)) {
      if (typeof raw !== "boolean") return { ok: false, error: "invalid_value", field };
      patch[key] = raw;
      continue;
    }
    if (raw === null || raw === "") { patch[key] = null; continue; }
    if (typeof raw !== "string") return { ok: false, error: "invalid_value", field };
    const value = raw.trim();
    if (!value) { patch[key] = null; continue; }
    if (!TEXT_RULES[key]?.(value)) return { ok: false, error: "invalid_value", field };
    patch[key] = value;
  }
  if (Object.keys(patch).length === 0) return { ok: false, error: "empty_patch" };
  return { ok: true, patch: patch as AgentSettingsPatch };
}

export function registrationsOf(settings: AgentSettings): Registrations {
  return { dltIndia: settings.dltIndiaRegistered, tdraUae: settings.tdraUaeRegistered, counselSignedOff: settings.counselSignedOff };
}

export type CallReadinessReason = "callismatic_off" | "caller_id_missing" | "call_purpose_missing";
export type MessageChannel = "whatsapp" | "sms";
export type MessageReadinessReason =
  | "omnidamus_off" | "whatsapp_not_linked" | "whatsapp_template_missing" | "sms_not_linked" | "sms_opening_text_missing";

/**
 * What stops a voice-agent call before the contactability gate. Triaxis's own organization calls
 * with Callismatic's defaults; every other organization needs its own caller ID and call purpose.
 */
export function callReadiness(settings: AgentSettings, isOperatorOrganization: boolean): CallReadinessReason[] {
  const reasons: CallReadinessReason[] = [];
  if (!settings.callismaticEnabled) reasons.push("callismatic_off");
  if (!isOperatorOrganization) {
    if (!settings.callerIdE164) reasons.push("caller_id_missing");
    if (!settings.callPurpose) reasons.push("call_purpose_missing");
  }
  return reasons;
}

/** What stops an agent conversation on a channel before the contactability gate. */
export function messageReadiness(settings: AgentSettings, channel: MessageChannel): MessageReadinessReason[] {
  const reasons: MessageReadinessReason[] = [];
  if (!settings.omnidamusEnabled) reasons.push("omnidamus_off");
  if (channel === "whatsapp") {
    if (!settings.whatsappPhoneNumberId || !settings.whatsappNumberE164) reasons.push("whatsapp_not_linked");
    if (!settings.whatsappTemplate) reasons.push("whatsapp_template_missing");
  } else {
    if (!settings.smsOriginationIdentity || !settings.smsNumberE164) reasons.push("sms_not_linked");
    if (!settings.smsOpeningText) reasons.push("sms_opening_text_missing");
  }
  return reasons;
}

export function isPlatformOperatorOrganization(organizationId: string, env: NodeJS.ProcessEnv = process.env): boolean {
  const operator = env.AXXESS_PLATFORM_OPERATOR_ORGANIZATION_ID;
  return Boolean(operator) && operator === organizationId;
}
