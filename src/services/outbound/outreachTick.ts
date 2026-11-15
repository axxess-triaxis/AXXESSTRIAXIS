// One run of the outreach email sender (GTM plan 2026-11-11, Day 2). Loads due enrollments for
// one organization, plans them through the contactability gate, sends allowed emails, and logs
// every decision. I/O is injected so the flow is testable; the route wires real dependencies.
import type { ContactChannel } from "../../compliance/contactability";
import { createUnsubscribeToken, renderOutreachEmail, type OutreachSender } from "./outreachEmail";
import { advanceEnrollment, planDueSends, type PlannerEnrollment, type PlannerLead } from "./sequencePlanner";

export type TickLead = PlannerLead & { contactName?: string; organizationName?: string };
export type TickSequence = { id: string; steps: { dayOffset: number; subject: string; body: string }[] };

export type TickState = {
  enrollments: PlannerEnrollment[];
  leads: Map<string, TickLead>;
  /** Approved sequences only. */
  sequences: Map<string, TickSequence>;
  suppressed: ReadonlySet<string>;
  /** Allowed attempts only; refusals must not count toward frequency caps. */
  attemptsByLead: Map<string, { channel: ContactChannel; at: Date }[]>;
  sentToday: number;
};

export type OutgoingEmail = { from: string; to: string; subject: string; text: string; html: string; headers: Record<string, string> };

export type OutreachTickDeps = {
  loadState: (organizationId: string, now: Date) => Promise<TickState>;
  /** idempotencyKey is per enrollment step, so a retried or overlapping run cannot send twice. */
  sendEmail: (email: OutgoingEmail, idempotencyKey: string) => Promise<{ id: string }>;
  recordAttempt: (attempt: {
    organizationId: string; leadId: string; enrollmentId: string; channel: "email";
    decision: "allowed" | "refused"; reasons: string[]; providerMessageId: string | null;
  }) => Promise<void>;
  updateEnrollment: (id: string, patch: { stepIndex?: number; nextSendAt: Date | null; status: "active" | "completed" | "stopped"; stopReasons: string[] }) => Promise<void>;
  config: {
    organizationId: string;
    from: string;
    sender: OutreachSender;
    appUrl: string;
    unsubscribeSecret: string;
    dailySendBudget: number;
  };
  now: () => Date;
};

export async function runOutreachTick(deps: OutreachTickDeps) {
  const { config } = deps;
  const now = deps.now();
  const state = await deps.loadState(config.organizationId, now);
  const actions = planDueSends({
    ...state,
    registrations: { dltIndia: false, tdraUae: false, counselSignedOff: false },
    dailySendBudget: config.dailySendBudget,
    now,
  });
  const summary = { sent: 0, stopped: 0, deferred: 0, failed: 0 };
  const enrollmentsById = new Map(state.enrollments.map((e) => [e.id, e]));

  for (const action of actions) {
    const enrollment = enrollmentsById.get(action.enrollmentId)!;
    const base = { organizationId: config.organizationId, leadId: enrollment.leadId, enrollmentId: enrollment.id, channel: "email" as const };

    if (action.kind === "stop") {
      await deps.recordAttempt({ ...base, decision: "refused", reasons: action.reasons, providerMessageId: null });
      await deps.updateEnrollment(enrollment.id, { status: "stopped", stopReasons: action.reasons, nextSendAt: null });
      summary.stopped += 1;
      continue;
    }
    if (action.kind === "defer") {
      await deps.recordAttempt({ ...base, decision: "refused", reasons: action.reasons, providerMessageId: null });
      await deps.updateEnrollment(enrollment.id, { status: "active", stopReasons: [], nextSendAt: action.until });
      summary.deferred += 1;
      continue;
    }

    const lead = state.leads.get(action.leadId)!;
    const sequence = state.sequences.get(enrollment.sequenceId)!;
    const token = createUnsubscribeToken(config.unsubscribeSecret, { organizationId: config.organizationId, identifier: action.to });
    const unsubscribeUrl = `${config.appUrl.replace(/\/$/, "")}/api/outreach/unsubscribe?token=${encodeURIComponent(token)}`;

    let rendered: ReturnType<typeof renderOutreachEmail>;
    try {
      rendered = renderOutreachEmail({ template: sequence.steps[action.stepIndex], lead, sender: config.sender, unsubscribeUrl });
    } catch {
      await deps.updateEnrollment(enrollment.id, { status: "stopped", stopReasons: ["template_render_failed"], nextSendAt: null });
      summary.stopped += 1;
      continue;
    }

    let messageId: string;
    try {
      ({ id: messageId } = await deps.sendEmail(
        { from: config.from, to: action.to, ...rendered },
        `outreach-${enrollment.id}-${action.stepIndex}`,
      ));
    } catch {
      summary.failed += 1;
      continue;
    }

    await deps.recordAttempt({ ...base, decision: "allowed", reasons: [], providerMessageId: messageId });
    const next = advanceEnrollment(enrollment, sequence, now);
    await deps.updateEnrollment(enrollment.id, { ...next, stopReasons: [] });
    summary.sent += 1;
  }
  return summary;
}
