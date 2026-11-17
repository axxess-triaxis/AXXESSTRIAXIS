// Email sequence planner (GTM plan 2026-11-11, Day 2). Pure: given due enrollments and what is
// known about each lead, decide per enrollment whether to send now, stop for good, or defer.
// Every send decision goes through checkContactability; the caller logs each decision to
// contact_attempts and performs the sends.
// Business-hours window (2026-11-17): an allowed email is only sent inside the lead's local
// business hours. Outside them the planner returns a "wait" action: nothing is logged, no budget
// is used, and the enrollment stays due for the first tick inside the window.
import {
  checkContactability,
  CONTACTABILITY_RULES,
  localTimeParts,
  type ConsentBasis,
  type ContactChannel,
  type RefusalReason,
} from "../../compliance/contactability";

const DAY_MS = 86_400_000;
const PERMANENT: ReadonlySet<RefusalReason> = new Set(["suppressed", "no_lawful_basis", "country_not_configured"]);

/** Local email send hours per country. Weekdays: 0 = Sunday. UAE weekend is Saturday and Sunday. */
export const EMAIL_SEND_WINDOWS: Record<string, { timeZone: string; start: number; end: number; weekdays: ReadonlySet<number> }> = {
  IN: { timeZone: CONTACTABILITY_RULES.IN.timeZone, start: 9, end: 18, weekdays: new Set([1, 2, 3, 4, 5, 6]) },
  AE: { timeZone: CONTACTABILITY_RULES.AE.timeZone, start: 9, end: 18, weekdays: new Set([1, 2, 3, 4, 5]) },
};

/** True inside the country's email window. Countries without a window are not restricted here. */
export function isWithinEmailWindow(country: string | undefined, now: Date): boolean {
  const window = country ? EMAIL_SEND_WINDOWS[country] : undefined;
  if (!window) return true;
  const { hour, weekday } = localTimeParts(now, window.timeZone);
  return window.weekdays.has(weekday) && hour >= window.start && hour < window.end;
}

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
  | { kind: "defer"; enrollmentId: string; until: Date; reasons: string[] }
  | { kind: "wait"; enrollmentId: string; reason: "outside_send_window" };

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

    if (!isWithinEmailWindow(lead.country, input.now)) {
      actions.push({ kind: "wait", enrollmentId: enrollment.id, reason: "outside_send_window" });
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
