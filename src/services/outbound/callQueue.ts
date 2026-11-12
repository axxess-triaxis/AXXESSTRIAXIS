// Daily human call queue (GTM plan 2026-11-11, Day 3). Pure functions: the route loads leads and
// their recent attempts, this decides who may be called right now through the contactability
// gate, and what a logged call outcome changes on the lead.
//
// Until DLT (India), TDRA (UAE) and counsel sign-off are recorded, the gate allows human calls only
// to contacts who opted in (a service callback). Everyone else is listed as refused, with reasons,
// so nobody dials a contact the gate would refuse.
import { checkContactability, type ConsentBasis, type ContactChannel, type RefusalReason } from "../../compliance/contactability";

export const CALL_OUTCOMES = ["connected", "no_answer", "voicemail", "wrong_number", "call_back", "not_interested", "interested"] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

export type QueueLead = {
  id: string;
  title: string;
  organizationName?: string;
  contactName?: string;
  phoneE164?: string;
  country?: string;
  consentBasis: ConsentBasis | null;
  stage: string;
  ownerUserId?: string;
  nextFollowUpAt?: string;
  registryStatus: "clear" | "listed" | "unchecked";
  registryCheckedAt: Date | null;
};

export type QueueReason = RefusalReason | "no_phone_number";

export type CallQueue = {
  callable: (QueueLead & { lastContactAt: string | null })[];
  refused: { lead: QueueLead; reasons: QueueReason[] }[];
};

export type Registrations = { dltIndia: boolean; tdraUae: boolean; counselSignedOff: boolean };

/** Sender-side registrations. None is recorded yet, so all are false, as in the email sender. */
export const CURRENT_REGISTRATIONS: Registrations = { dltIndia: false, tdraUae: false, counselSignedOff: false };

export function decideCall(input: {
  lead: QueueLead;
  suppressed: boolean;
  attempts: { channel: ContactChannel; at: Date }[];
  registrations: Registrations;
  now: Date;
}): { allowed: boolean; reasons: QueueReason[] } {
  if (!input.lead.phoneE164) return { allowed: false, reasons: ["no_phone_number"] };
  return checkContactability({
    channel: "voice_human",
    country: input.lead.country ?? "",
    consentBasis: input.lead.consentBasis,
    suppressed: input.suppressed,
    registry: { status: input.lead.registryStatus, checkedAt: input.lead.registryCheckedAt },
    recentAttempts: input.attempts,
    registrations: input.registrations,
    now: input.now,
  });
}

export function buildCallQueue(input: {
  leads: QueueLead[];
  suppressed: Set<string>;
  attemptsByLead: Map<string, { channel: ContactChannel; at: Date }[]>;
  registrations: Registrations;
  now: Date;
}): CallQueue {
  const queue: CallQueue = { callable: [], refused: [] };
  for (const lead of input.leads) {
    const attempts = input.attemptsByLead.get(lead.id) ?? [];
    const decision = decideCall({
      lead,
      suppressed: Boolean(lead.phoneE164 && input.suppressed.has(lead.phoneE164)),
      attempts,
      registrations: input.registrations,
      now: input.now,
    });
    if (decision.allowed) {
      const last = attempts.reduce<Date | null>((max, a) => (!max || a.at > max ? a.at : max), null);
      queue.callable.push({ ...lead, lastContactAt: last?.toISOString() ?? null });
    } else {
      queue.refused.push({ lead, reasons: decision.reasons });
    }
  }
  // Due follow-ups first (earliest first), then leads never or least recently contacted.
  const time = (iso: string | null | undefined, fallback: number) => (iso ? new Date(iso).getTime() : fallback);
  queue.callable.sort((a, b) =>
    time(a.nextFollowUpAt, Infinity) - time(b.nextFollowUpAt, Infinity)
    || time(a.lastContactAt, -Infinity) - time(b.lastContactAt, -Infinity));
  return queue;
}

/** Lead changes implied by a call outcome. Only moves forward from the starting stage. */
export function leadChangesForOutcome(outcome: CallOutcome, lead: { stage: string }): { stage?: "qualifying"; status?: "lost" } {
  if (outcome === "interested" && lead.stage === "new") return { stage: "qualifying" };
  if (outcome === "not_interested") return { status: "lost" };
  return {};
}

export function isCallOutcome(value: unknown): value is CallOutcome {
  return typeof value === "string" && (CALL_OUTCOMES as readonly string[]).includes(value);
}
