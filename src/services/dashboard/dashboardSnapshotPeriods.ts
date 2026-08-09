// A-110 (2026-08-09): Executive Dashboard top section -- Daily/Weekly/Monthly/Year-on-Year snapshots,
// Insights, and Actionables. This is a new, parallel layer to tileScoring.ts/tilePolicies.ts/
// buildDashboardSnapshot.ts -- those are a single-value, current-state, priority x criticality model
// ("what is true right now"); this file is about change over a date range, a structurally different
// question. See docs/readiness/A105_A106_A107_ROOT_CAUSE_ANALYSIS_2026_08_09.md's A-110 plan.
//
// Hard constraint carried over from this repo's existing "no fabricated data" discipline
// (src/features/dashboard/data.ts's own real-tenant delta handling): every number here is computed
// live from real, already-timestamped rows -- never a plausible-looking placeholder. Year-on-Year is
// not computed at all in this pass -- every migration in this repo is dated between 2026-07-02 and
// 2026-08-04, so no real tenant can have 12 months of history yet; the UI renders an honest,
// tenant-specific empty state instead (see earliestTenantActivityDate below).
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../repositories/supabaseAdmin";

export type SnapshotPeriodKey = "daily" | "weekly" | "monthly" | "yoy";

export type PeriodWindow = {
  start: string;
  end: string;
  previousStart: string;
  previousEnd: string;
};

// Pure date math, independently testable without any network mocking.
export function periodWindow(period: Exclude<SnapshotPeriodKey, "yoy">, now: Date = new Date()): PeriodWindow {
  const end = now.toISOString();

  if (period === "daily") {
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    return { start: startOfToday.toISOString(), end, previousStart: startOfYesterday.toISOString(), previousEnd: startOfToday.toISOString() };
  }

  if (period === "weekly") {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const previousStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    return { start: start.toISOString(), end, previousStart: previousStart.toISOString(), previousEnd: start.toISOString() };
  }

  // monthly: calendar month-to-date vs. the same number of elapsed days in the prior calendar month.
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const daysElapsed = Math.floor((now.getTime() - startOfMonth.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const startOfPreviousMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const previousEnd = new Date(startOfPreviousMonth.getTime() + daysElapsed * 24 * 60 * 60 * 1000);
  return { start: startOfMonth.toISOString(), end, previousStart: startOfPreviousMonth.toISOString(), previousEnd: previousEnd.toISOString() };
}

export type SnapshotPeriodCounts = {
  tasksCreated: number;
  /** Approximation, not an exact completion timestamp -- no `completed_at` column exists on
   * `tasks`; this counts rows with status='completed' whose `updated_at` falls in the window,
   * labeled "marked completed" wherever it's rendered, not claimed as precise. */
  tasksCompleted: number;
  meetingsHeld: number;
  aiReviewsCreated: number;
  aiReviewsDecided: number;
  aiReviewsEscalated: number;
  documentsAdded: number;
  auditEvents: number;
  workflowEvents: number;
};

const zeroCounts: SnapshotPeriodCounts = {
  tasksCreated: 0,
  tasksCompleted: 0,
  meetingsHeld: 0,
  aiReviewsCreated: 0,
  aiReviewsDecided: 0,
  aiReviewsEscalated: 0,
  documentsAdded: 0,
  auditEvents: 0,
  workflowEvents: 0,
};

// Same gte./lt. range-filter convention already used by recentTimelineEvents() in
// src/services/platform/dashboardSnapshotDeltas.ts -- a real, already-established pattern in this
// codebase, not invented here. select=id is enough since only the row count is needed.
async function countInRange(
  table: string,
  column: string,
  organizationId: string,
  start: string,
  end: string,
  extraFilter?: Record<string, string>,
): Promise<number> {
  const query = new URLSearchParams({ select: "id", organization_id: `eq.${organizationId}` });
  query.append(column, `gte.${start}`);
  query.append(column, `lt.${end}`);
  if (extraFilter) {
    for (const [key, value] of Object.entries(extraFilter)) query.set(key, value);
  }
  const rows = await supabaseAdminRest<Array<{ id: string }>>(table, { query }).catch(() => []);
  return rows.length;
}

export async function fetchSnapshotPeriodCounts(organizationId: string, window: { start: string; end: string }): Promise<SnapshotPeriodCounts> {
  // No admin client configured (e.g. local dev without service-role env vars) -- return honest
  // zeros, never demo numbers, matching this repo's real-tenant-gets-real-or-empty discipline.
  if (!isSupabaseAdminConfigured()) return { ...zeroCounts };

  const { start, end } = window;
  const [
    tasksCreated,
    tasksCompleted,
    meetingsHeld,
    aiReviewsCreated,
    aiReviewsDecided,
    aiReviewsEscalated,
    documentsAdded,
    auditEvents,
    workflowEvents,
  ] = await Promise.all([
    countInRange("tasks", "created_at", organizationId, start, end),
    countInRange("tasks", "updated_at", organizationId, start, end, { status: "eq.completed" }),
    countInRange("meetings", "starts_at", organizationId, start, end, { status: "eq.completed" }),
    countInRange("ai_operation_reviews", "created_at", organizationId, start, end),
    countInRange("ai_operation_reviews", "reviewed_at", organizationId, start, end),
    countInRange("ai_operation_reviews", "reviewed_at", organizationId, start, end, { status: "eq.escalated" }),
    countInRange("documents", "created_at", organizationId, start, end),
    countInRange("audit_logs", "created_at", organizationId, start, end),
    countInRange("workflow_timeline_events", "created_at", organizationId, start, end),
  ]);

  return { tasksCreated, tasksCompleted, meetingsHeld, aiReviewsCreated, aiReviewsDecided, aiReviewsEscalated, documentsAdded, auditEvents, workflowEvents };
}

export type SnapshotPeriodResult = {
  period: Exclude<SnapshotPeriodKey, "yoy">;
  window: PeriodWindow;
  current: SnapshotPeriodCounts;
  previous: SnapshotPeriodCounts;
};

export async function buildSnapshotPeriod(
  organizationId: string,
  period: Exclude<SnapshotPeriodKey, "yoy">,
  now: Date = new Date(),
): Promise<SnapshotPeriodResult> {
  const window = periodWindow(period, now);
  const [current, previous] = await Promise.all([
    fetchSnapshotPeriodCounts(organizationId, { start: window.start, end: window.end }),
    fetchSnapshotPeriodCounts(organizationId, { start: window.previousStart, end: window.previousEnd }),
  ]);
  return { period, window, current, previous };
}

// Used only to render a real, tenant-specific "recording since" date on the YoY empty state --
// never used to attempt an actual year-over-year comparison in this pass.
export async function earliestTenantActivityDate(organizationId: string): Promise<string | undefined> {
  if (!isSupabaseAdminConfigured()) return undefined;
  const query = new URLSearchParams({
    select: "created_at",
    organization_id: `eq.${organizationId}`,
    order: "created_at.asc",
    limit: "1",
  });
  const rows = await supabaseAdminRest<Array<{ created_at: string }>>("workflow_timeline_events", { query }).catch(() => []);
  return rows[0]?.created_at;
}

export type SnapshotInsight = { id: string; text: string; tone: "positive" | "neutral" | "warning" };

// Template-based, not generative -- see the A-110 plan's explicit rejection of an LLM-generated
// design (real per-page-load AI spend for a sentence a template can produce deterministically from
// numbers already computed above). Weekly-comparison only in this pass -- at this product's current
// age, monthly-over-monthly data is too thin to be a meaningful comparison yet.
export function deriveSnapshotInsights(weekly?: Pick<SnapshotPeriodResult, "current" | "previous">): SnapshotInsight[] {
  if (!weekly) return [];
  const { current, previous } = weekly;
  const previousTotal = Object.values(previous).reduce((sum, value) => sum + value, 0);
  if (previousTotal === 0) {
    return [{ id: "no-prior-activity", text: "Not enough activity last week to compare yet.", tone: "neutral" }];
  }

  const candidates: Array<SnapshotInsight & { absDelta: number }> = [];

  const escalatedDelta = current.aiReviewsEscalated - previous.aiReviewsEscalated;
  if (escalatedDelta !== 0) {
    candidates.push({
      id: "ai-reviews-escalated",
      text: `${Math.abs(escalatedDelta)} ${escalatedDelta > 0 ? "more" : "fewer"} AI review${Math.abs(escalatedDelta) === 1 ? "" : "s"} escalated this week than last.`,
      tone: escalatedDelta > 0 ? "warning" : "positive",
      absDelta: Math.abs(escalatedDelta),
    });
  }

  const completedDelta = current.tasksCompleted - previous.tasksCompleted;
  if (completedDelta !== 0) {
    candidates.push({
      id: "tasks-completed",
      text: `Task completions ${completedDelta > 0 ? "up" : "down"} ${Math.abs(completedDelta)} vs last week.`,
      tone: completedDelta > 0 ? "positive" : "neutral",
      absDelta: Math.abs(completedDelta),
    });
  }

  const meetingsDelta = current.meetingsHeld - previous.meetingsHeld;
  if (meetingsDelta !== 0) {
    candidates.push({
      id: "meetings-held",
      text: `Meetings held ${meetingsDelta > 0 ? "up" : "down"} ${Math.abs(meetingsDelta)} vs last week.`,
      tone: "neutral",
      absDelta: Math.abs(meetingsDelta),
    });
  }

  const documentsDelta = current.documentsAdded - previous.documentsAdded;
  if (documentsDelta !== 0) {
    candidates.push({
      id: "documents-added",
      text: `${Math.abs(documentsDelta)} ${documentsDelta > 0 ? "more" : "fewer"} document${Math.abs(documentsDelta) === 1 ? "" : "s"} added this week than last.`,
      tone: "neutral",
      absDelta: Math.abs(documentsDelta),
    });
  }

  return candidates
    .sort((a, b) => b.absDelta - a.absDelta)
    .slice(0, 3)
    .map(({ id, text, tone }) => ({ id, text, tone }));
}
