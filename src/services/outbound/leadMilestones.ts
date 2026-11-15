// Lead milestones (GTM funnel follow-up, 2026-11-15): a meeting booked or held, or a trial started,
// logged by staff against a lead. Pure rules only; the route and repository do the writing.
// Paid is not a milestone: revenue is reported only from billing records.

export const MILESTONE_KINDS = ["meeting_booked", "meeting_held", "trial_started"] as const;
export type MilestoneKind = (typeof MILESTONE_KINDS)[number];

export const MAX_MILESTONE_NOTE = 500;
/** How far ahead occurredAt may be: a meeting booked for tomorrow is fine, next month is a typo. */
export const MAX_FUTURE_MS = 86_400_000;

export function isMilestoneKind(value: unknown): value is MilestoneKind {
  return typeof value === "string" && (MILESTONE_KINDS as readonly string[]).includes(value);
}

const CLOSED_STAGES = new Set(["won", "lost"]);

/**
 * Stage change for a milestone. A meeting moves a new lead to qualifying; a trial moves a new or
 * qualifying lead to proposal. Leads further on, or won or lost, are left as they are.
 */
export function leadChangesForMilestone(kind: MilestoneKind, lead: { stage: string; status: string }): { stage?: "qualifying" | "proposal" } {
  if (CLOSED_STAGES.has(lead.stage) || CLOSED_STAGES.has(lead.status)) return {};
  if (kind === "trial_started") return lead.stage === "new" || lead.stage === "qualifying" ? { stage: "proposal" } : {};
  return lead.stage === "new" ? { stage: "qualifying" } : {};
}

export type MilestoneInput = { kind: MilestoneKind; occurredAt: string; note: string | null };

/** Validates the request body. Returns the cleaned input or an error message for a 400. */
export function parseMilestoneInput(body: unknown, now: Date): { ok: true; value: MilestoneInput } | { ok: false; error: string } {
  const input = (body && typeof body === "object" ? body : {}) as { kind?: unknown; occurredAt?: unknown; note?: unknown };
  if (!isMilestoneKind(input.kind)) return { ok: false, error: `kind must be one of ${MILESTONE_KINDS.join(", ")}.` };

  let occurredAt = now.toISOString();
  if (input.occurredAt !== undefined) {
    if (typeof input.occurredAt !== "string" || Number.isNaN(Date.parse(input.occurredAt))) {
      return { ok: false, error: "occurredAt must be an ISO date." };
    }
    const at = new Date(input.occurredAt);
    if (at.getTime() - now.getTime() > MAX_FUTURE_MS) return { ok: false, error: "occurredAt may be at most one day in the future." };
    occurredAt = at.toISOString();
  }

  if (input.note !== undefined && input.note !== null && (typeof input.note !== "string" || input.note.length > MAX_MILESTONE_NOTE)) {
    return { ok: false, error: `note must be text of at most ${MAX_MILESTONE_NOTE} characters.` };
  }
  const note = typeof input.note === "string" && input.note.trim() ? input.note.trim() : null;
  return { ok: true, value: { kind: input.kind, occurredAt, note } };
}
