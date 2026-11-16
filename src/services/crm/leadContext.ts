// Automation plan Phase 1 (2026-11-16): the lead context layer. Pure rules for the agent-facing lead
// tools (src/services/agents/leadTools.ts): validating an upsert or a conversation, and deciding what an
// agent may change on an existing lead. Database access lives in src/repositories/leadContextRepository.ts.
//
// HITL boundary, by design: an agent may create a lead, fill blank fields and move a lead forward up to
// "proposal". It may never reassign an owner, move a lead back, or close it as won or lost -- those stay
// human decisions in the Leads page. Recording a lead never makes it contactable: outbound outreach still
// passes the contactability gate, which needs a consent basis that only a human or a vetted import sets.
import type { CrmLeadStage } from "../../domain";
import { normaliseEmail, normalisePhone } from "../outbound/leadImport";

export const AGENT_MAX_STAGE: CrmLeadStage = "proposal";
const STAGE_ORDER: CrmLeadStage[] = ["new", "qualifying", "proposal", "negotiation", "won", "lost"];
export const CONVERSATION_CHANNELS = ["voice", "sms", "whatsapp", "email", "chat", "other"] as const;
export type ConversationChannel = (typeof CONVERSATION_CHANNELS)[number];
export const MAX_SUMMARY = 2000;
export const MAX_SEARCH_RESULTS = 25;

export type UpsertLeadInput = {
  email?: string;
  phoneE164?: string;
  contactName?: string;
  organizationName?: string;
  country?: string;
  source: string;
  stage?: CrmLeadStage;
  title?: string;
};

export type ConversationInput = {
  leadId: string;
  channel: ConversationChannel;
  direction: "inbound" | "outbound";
  source: string;
  externalId?: string;
  summary: string;
  occurredAt: string;
};

type Parsed<T> = { ok: true; value: T } | { ok: false; message: string };

const E164 = /^\+[1-9][0-9]{6,14}$/;
const EMAIL = /^[^\s@",()]+@[^\s@",()]+\.[^\s@",()]+$/;
const SOURCE = /^[a-z0-9_.:-]{1,60}$/;
const UUID = /^[0-9a-f-]{36}$/i;

function optionalText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function stageRank(stage: CrmLeadStage): number {
  return STAGE_ORDER.indexOf(stage);
}

export function parseUpsertLeadInput(args: Record<string, unknown>): Parsed<UpsertLeadInput> {
  const email = optionalText(args.email, 320);
  const phoneRaw = optionalText(args.phoneE164, 32);
  const phone = phoneRaw ? normalisePhone(phoneRaw) : undefined;
  if (!email && !phone) return { ok: false, message: "email or phoneE164 is required to match or create a lead." };
  if (email && !EMAIL.test(email)) return { ok: false, message: "email is not a valid address." };
  if (phone && !E164.test(phone)) return { ok: false, message: "phoneE164 must be in E.164 form, for example +971501234567." };
  const source = optionalText(args.source, 60)?.toLowerCase();
  if (!source || !SOURCE.test(source)) return { ok: false, message: "source is required: lowercase letters, digits and _ . : - only (for example callismatic_inbound_call)." };
  const country = optionalText(args.country, 10)?.toUpperCase();
  if (country && !/^[A-Z]{2}$/.test(country)) return { ok: false, message: "country must be a two-letter ISO code." };
  const stage = args.stage === undefined ? undefined : args.stage;
  if (stage !== undefined && (typeof stage !== "string" || !STAGE_ORDER.includes(stage as CrmLeadStage))) {
    return { ok: false, message: `stage must be one of ${STAGE_ORDER.join(", ")}.` };
  }
  if (stage !== undefined && stageRank(stage as CrmLeadStage) > stageRank(AGENT_MAX_STAGE)) {
    return { ok: false, message: `An agent may move a lead at most to ${AGENT_MAX_STAGE}; negotiation, won and lost are set by a person.` };
  }
  return {
    ok: true,
    value: {
      email: email ? normaliseEmail(email) : undefined,
      phoneE164: phone,
      contactName: optionalText(args.contactName, 200),
      organizationName: optionalText(args.organizationName, 200),
      country,
      source,
      stage: stage as CrmLeadStage | undefined,
      title: optionalText(args.title, 200),
    },
  };
}

export type ExistingLeadFields = {
  contactName?: string; organizationName?: string; country?: string; contactEmail?: string; contactPhoneE164?: string;
  stage: CrmLeadStage; status: string;
};

/** What an agent's upsert may change on an existing lead: fill blanks, and move forward up to proposal. */
export function agentLeadPatch(existing: ExistingLeadFields, input: UpsertLeadInput): Record<string, string> {
  const patch: Record<string, string> = {};
  if (!existing.contactName && input.contactName) patch.contact_name = input.contactName;
  if (!existing.organizationName && input.organizationName) patch.organization_name = input.organizationName;
  if (!existing.country && input.country) patch.country = input.country;
  if (!existing.contactEmail && input.email) patch.contact_email = input.email;
  if (!existing.contactPhoneE164 && input.phoneE164) patch.contact_phone_e164 = input.phoneE164;
  const closed = existing.status !== "open" || existing.stage === "won" || existing.stage === "lost";
  if (!closed && input.stage && stageRank(input.stage) > stageRank(existing.stage)) patch.stage = input.stage;
  return patch;
}

export function leadTitleFor(input: UpsertLeadInput): string {
  if (input.title) return input.title;
  const who = input.contactName ?? input.email ?? input.phoneE164 ?? "Unknown contact";
  return (input.organizationName ? `${input.organizationName} - ${who}` : who).slice(0, 200);
}

export function parseConversationInput(args: Record<string, unknown>, now = new Date()): Parsed<ConversationInput> {
  if (!isUuid(args.leadId)) return { ok: false, message: "leadId must be a lead id." };
  if (typeof args.channel !== "string" || !(CONVERSATION_CHANNELS as readonly string[]).includes(args.channel)) {
    return { ok: false, message: `channel must be one of ${CONVERSATION_CHANNELS.join(", ")}.` };
  }
  if (args.direction !== "inbound" && args.direction !== "outbound") return { ok: false, message: "direction must be inbound or outbound." };
  const source = optionalText(args.source, 60)?.toLowerCase();
  if (!source || !SOURCE.test(source)) return { ok: false, message: "source is required: lowercase letters, digits and _ . : - only." };
  const summary = optionalText(args.summary, MAX_SUMMARY + 1);
  if (!summary) return { ok: false, message: "summary is required." };
  if (summary.length > MAX_SUMMARY) return { ok: false, message: `summary may be at most ${MAX_SUMMARY} characters.` };
  const externalId = optionalText(args.externalId, 201);
  if (externalId && externalId.length > 200) return { ok: false, message: "externalId may be at most 200 characters." };
  let occurredAt = now.toISOString();
  if (args.occurredAt !== undefined) {
    const parsed = typeof args.occurredAt === "string" ? new Date(args.occurredAt) : new Date(Number.NaN);
    if (Number.isNaN(parsed.getTime())) return { ok: false, message: "occurredAt must be an ISO date-time." };
    if (parsed.getTime() > now.getTime() + 5 * 60_000) return { ok: false, message: "occurredAt cannot be in the future." };
    occurredAt = parsed.toISOString();
  }
  return { ok: true, value: { leadId: args.leadId, channel: args.channel as ConversationChannel, direction: args.direction, source, externalId, summary, occurredAt } };
}

/** A search term safe to place inside a PostgREST ilike pattern. */
export function searchTerm(value: unknown): string | undefined {
  const text = optionalText(value, 100)?.replace(/[%*,()"\\]/g, " ").trim();
  return text && text.length >= 2 ? text : undefined;
}
