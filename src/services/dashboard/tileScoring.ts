// Executive Dashboard Redesign Sprint ED-R1: the Priority x Criticality scoring engine.
// See docs/readiness/EXECUTIVE_DASHBOARD_REDESIGN_PLAN_2026_08_01.md for the full derivation.

export type CriticalityBand = "green" | "yellow" | "orange" | "amber" | "red";
export type PriorityLevel1to5 = 1 | 2 | 3 | 4 | 5;
export type DashboardTier = 1 | 2 | 3;

// "live": real tenant data backs this tile today.
// "partial": some real data exists but the signal is incomplete (e.g. a status without a count).
// "not-connected": the founder-requested source has no repository/integration in this codebase yet.
// "empty": a real, live query ran and genuinely returned nothing (not the same as not-connected).
// "demo": only ever rendered in Investor Preview / demo mode, never for a real tenant.
export type DashboardTileDataState = "live" | "partial" | "not-connected" | "empty" | "demo";

export type ScoredTile = {
  id: string;
  tier: DashboardTier;
  title: string;
  value: string;
  detail: string;
  priority: PriorityLevel1to5;
  criticality: CriticalityBand;
  score: number;
  dataState: DashboardTileDataState;
  route?: string;
  rationale?: string;
};

export const CRITICALITY_WEIGHT: Record<CriticalityBand, 1 | 2 | 3 | 4 | 5> = {
  green: 1,
  yellow: 2,
  orange: 3,
  amber: 4,
  red: 5,
};

export function computeScore(priority: PriorityLevel1to5, criticality: CriticalityBand): number {
  return priority * CRITICALITY_WEIGHT[criticality];
}

// Urgent Attention qualifying rule: score >= 16, uniform across all three per-tier bars.
//
// Why 16 and not 15: Priority(3) x Red(5) = 15 -- a Priority-3 item must NOT qualify for Urgent
// Attention regardless of how severe its Criticality is (explicitly excluded per the founder's
// spec, see plan doc Round 4). 16 is the smallest integer cutoff that excludes 3x5=15 while
// staying a round, simple number -- not a data-fitted statistical optimum (this repo has no
// historical alert-outcome dataset to compute one against; this is a principled design cutoff).
//
// At >=16 the qualifying set is exactly 4 of the 25 (priority, criticality) cells:
// P4xAmber(16), P4xRed(20), P5xAmber(20), P5xRed(25) -- 16% of the grid. P3xRed(15) is excluded
// by the threshold itself, with no special-case logic required.
export function qualifiesForUrgentAttention(priority: PriorityLevel1to5, criticality: CriticalityBand): boolean {
  return computeScore(priority, criticality) >= 16;
}
