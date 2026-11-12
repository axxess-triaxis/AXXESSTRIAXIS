// Email sequence planner (GTM plan 2026-11-11, Day 2). Pure: given due enrollments and what is
// known about each lead, decide per enrollment whether to send now, stop for good, or defer.
// Every send decision goes through checkContactability; the caller logs each decision to
// contact_attempts and performs the sends.
import { checkContactability, type ConsentBasis, type ContactChannel, type RefusalReason } from "../../compliance/contactability";

const DAY_MS = 86_400_000;
const PERMANENT: ReadonlySet<RefusalReason> = new Set(["suppressed", "no_lawful_basis", "country_not_configured"]);

export type PlannerLead = {
  id: string;
  country?: string;
  consentBasis: ConsentBasis | null;
  contactEmail?: string;
  status: "open" | "stalled" | "won" | "lost";
  registryStatus: "clear" | "listed" | "unchecked";
  registryCheckedAt: Date | null;
};

export type PlannerEnrollment = {
  id: string;
  leadId: string;
  sequenceId: string;
  stepIndex: number;
  nextSendAt: Date | null;
  status: "active" | "completed" | "stopped";
};

export type PlannerSequence = { id: string; steps: { dayOffset: number }[] };

export type PlannerInput = {
  enrollments: PlannerEnrollment[];
  leads: Map<string, PlannerLead>;
  sequences: Map<string, PlannerSequence>;
  suppressed: ReadonlySet<string>;
  attemptsByLead: Map<string, { channel: ContactChannel; at: Date }[]>;
  registrations: { dltIndia: boolean; tdraUae: boolean; counselSignedOff: boolean };
  dailySendBudget: number;
  sentToday: number;
  now: Date;
};

export type PlannedAction =
  | { kind: "send"; enrollmentId: string; leadId: string; stepIndex: number; to: string }
  | { kind: "stop"; enrollmentId: string; reasons: string[] }
  | { kind: "defer"; enrollmentId: string; until: Date; reasons: string[] };

export function planDueSends(input: PlannerInput): PlannedAction[] {
  const actions: PlannedAction[] = [];
  let budget = Math.max(0, input.dailySendBudget - input.sentToday);
  const leadsSentThisRun = new Set<string>();

  const due = input.enrollments
    .filter((e) => e.status === "active" && e.nextSendAt && e.nextSendAt.getTime() <= input.now.getTime())
    .sort((a, b) => (a.nextSendAt?.getTime() ?? 0) - (b.nextSendAt?.getTime() ?? 0));

  for (const enrollment of due) {
    const lead = input.leads.get(enrollment.leadId);
    const sequence = input.sequences.get(enrollment.sequenceId);
    if (!lead || !sequence || enrollment.stepIndex >= sequence.steps.length) {
      actions.push({ kind: "stop", enrollmentId: enrollment.id, reasons: ["sequence_or_lead_missing"] });
      continue;
    }
    if (lead.status === "won" || lead.status === "lost") {
      actions.push({ kind: "stop", enrollmentId: enrollment.id, reasons: ["lead_closed"] });
      continue;
    }
    const to = lead.contactEmail?.trim().toLowerCase();
    if (!to) {
      actions.push({ kind: "stop", enrollmentId: enrollment.id, reasons: ["no_email_address"] });
      continue;
    }

    const decision = checkContactability({
      channel: "email",
      country: lead.country ?? "",
      consentBasis: lead.consentBasis,
      suppressed: input.suppressed.has(to),
      registry: { status: lead.registryStatus, checkedAt: lead.registryCheckedAt },
      recentAttempts: input.attemptsByLead.get(lead.id) ?? [],
      registrations: input.registrations,
      now: input.now,
    });

    if (!decision.allowed) {
      if (decision.reasons.some((r) => PERMANENT.has(r))) {
        actions.push({ kind: "stop", enrollmentId: enrollment.id, reasons: decision.reasons });
      } else {
        actions.push({ kind: "defer", enrollmentId: enrollment.id, until: new Date(input.now.getTime() + DAY_MS), reasons: decision.reasons });
      }
      continue;
    }

    if (budget === 0 || leadsSentThisRun.has(lead.id)) continue;
    budget -= 1;
    leadsSentThisRun.add(lead.id);
    actions.push({ kind: "send", enrollmentId: enrollment.id, leadId: lead.id, stepIndex: enrollment.stepIndex, to });
  }
  return actions;
}

export function advanceEnrollment(enrollment: { stepIndex: number }, sequence: PlannerSequence, sentAt: Date) {
  const next = enrollment.stepIndex + 1;
  if (next >= sequence.steps.length) return { stepIndex: next, nextSendAt: null, status: "completed" as const };
  const gapDays = sequence.steps[next].dayOffset - sequence.steps[enrollment.stepIndex].dayOffset;
  return { stepIndex: next, nextSendAt: new Date(sentAt.getTime() + gapDays * DAY_MS), status: "active" as const };
}
