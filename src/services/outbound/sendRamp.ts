// Daily email volume rule (GTM plan 2026-11-11, Day 4 item 2): "raise volume only while bounces
// stay under 2% and complaints under 0.1%". Pure, so the rule is tested on its own; the tick route
// loads the counts and passes the result to the sender as its daily budget.

export const RAMP_FLOOR = 20;
export const RAMP_MIN_SAMPLE = 50;
export const RAMP_GROWTH = 1.5;
export const BOUNCE_LIMIT = 0.02;
export const COMPLAINT_LIMIT = 0.001;
export const HARD_CEILING = 200;

export type SendHealth = {
  /** OUTREACH_DAILY_SEND_BUDGET: the founder's cap, at most 200. */
  ceiling: number;
  /** Emails sent on each of the last 7 UTC days, oldest first, today last. */
  sentPerDay: number[];
  bounces7d: number;
  complaints7d: number;
};

export type BudgetReason = "warming_up" | "ramping" | "paused_bounce_rate" | "paused_complaint_rate";
export type BudgetDecision = { budget: number; reason: BudgetReason };

export function decideDailyBudget(health: SendHealth): BudgetDecision {
  const ceiling = Number.isFinite(health.ceiling) ? Math.min(Math.max(Math.floor(health.ceiling), 0), HARD_CEILING) : RAMP_FLOOR;
  const sent7d = health.sentPerDay.reduce((sum, n) => sum + Math.max(0, n), 0);

  if (sent7d < RAMP_MIN_SAMPLE) return { budget: Math.min(ceiling, RAMP_FLOOR), reason: "warming_up" };
  // Rates are checked as counts so floating-point rounding can't move a boundary case.
  if (health.complaints7d * 1000 >= sent7d * COMPLAINT_LIMIT * 1000) return { budget: 0, reason: "paused_complaint_rate" };
  if (health.bounces7d * 100 >= sent7d * BOUNCE_LIMIT * 100) return { budget: 0, reason: "paused_bounce_rate" };

  const busiestDay = Math.max(0, ...health.sentPerDay);
  const ramped = Math.max(RAMP_FLOOR, Math.floor(busiestDay * RAMP_GROWTH));
  return { budget: Math.min(ceiling, ramped), reason: "ramping" };
}

export function rate(part: number, whole: number): number {
  return whole > 0 ? part / whole : 0;
}
