"use client";

import { useState } from "react";
import { EmptyState, MetricCard, SectionCard } from "../../components/enterprise";
import type { EnterpriseWorkflowAction } from "../../services/workflows/enterpriseGoldenPath";
import type { DashboardSnapshotPeriods } from "../../hooks/useDashboardSnapshotPeriods";
import { deriveSnapshotInsights, type SnapshotPeriodCounts, type SnapshotPeriodResult } from "../../services/dashboard/dashboardSnapshotPeriods";

// A-110 (2026-08-09): the Executive Dashboard top section -- 6 sub-sections: Daily/Weekly/Monthly/
// Year-on-Year Snapshot, Insights, Actionables. Design: a 4-way tab/segmented control sharing one
// metrics panel, plus two always-visible cards below for Insights and Actionables -- not 6
// simultaneous cards. TenantHealthCommandCenter.tsx already puts 4 metric cards one scroll below
// this; showing all 4 periods at once here would mean ~24 competing numbers at the very top of an
// already-dense page, right above the fixed-position UrgentAttentionBarStack. See
// docs/readiness/A105_A106_A107_ROOT_CAUSE_ANALYSIS_2026_08_09.md's A-110 plan for the full
// reasoning, including why Year-on-Year renders an honest empty state rather than a real comparison.

type PeriodTab = "daily" | "weekly" | "monthly" | "yoy";

const periodTabs: { value: PeriodTab; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yoy", label: "Year on Year" },
];

function delta(current: number, previous: number, noun: string): string {
  const diff = current - previous;
  if (diff === 0) return `No change vs ${noun}`;
  return `${diff > 0 ? "+" : ""}${diff} vs ${noun}`;
}

function metricsFor(result: SnapshotPeriodResult, noun: string) {
  const c: SnapshotPeriodCounts = result.current;
  const p: SnapshotPeriodCounts = result.previous;
  return [
    { label: "Tasks created", value: c.tasksCreated, detail: delta(c.tasksCreated, p.tasksCreated, noun) },
    // "Marked completed," not an exact completion timestamp -- no completed_at column exists on
    // tasks; this counts status='completed' rows whose updated_at falls in the window.
    { label: "Tasks marked completed", value: c.tasksCompleted, detail: delta(c.tasksCompleted, p.tasksCompleted, noun) },
    { label: "Meetings held", value: c.meetingsHeld, detail: delta(c.meetingsHeld, p.meetingsHeld, noun) },
    { label: "AI reviews decided", value: c.aiReviewsDecided, detail: delta(c.aiReviewsDecided, p.aiReviewsDecided, noun) },
    { label: "AI reviews escalated", value: c.aiReviewsEscalated, detail: delta(c.aiReviewsEscalated, p.aiReviewsEscalated, noun) },
    { label: "Documents added", value: c.documentsAdded, detail: delta(c.documentsAdded, p.documentsAdded, noun) },
  ];
}

const periodNoun: Record<Exclude<PeriodTab, "yoy">, string> = {
  daily: "yesterday",
  weekly: "last week",
  monthly: "last month",
};

export type SnapshotActionable = { id: string; label: string; route: string; source: "golden-path" | "ai-review" | "overdue-task" | "overdue-meeting" };

// Composed entirely from signals already fetched elsewhere on the dashboard page -- zero new
// queries, per the A-110 plan's explicit requirement.
export function buildActionablesFeed(input: {
  actionQueue: EnterpriseWorkflowAction[];
  pendingAiReviewCount: number;
  overdueTaskCount?: number;
  overdueMeetingCount?: number;
}): SnapshotActionable[] {
  const items: SnapshotActionable[] = input.actionQueue.map((action) => ({
    id: `golden-path-${action.stepId}`,
    label: action.label,
    route: action.route,
    source: "golden-path",
  }));
  if (input.pendingAiReviewCount > 0) {
    items.push({ id: "pending-ai-reviews", label: `${input.pendingAiReviewCount} AI review${input.pendingAiReviewCount === 1 ? "" : "s"} pending`, route: "/ai-workspace/review-inbox", source: "ai-review" });
  }
  if ((input.overdueTaskCount ?? 0) > 0) {
    items.push({ id: "overdue-tasks", label: `${input.overdueTaskCount} task${input.overdueTaskCount === 1 ? "" : "s"} overdue`, route: "/tasks", source: "overdue-task" });
  }
  if ((input.overdueMeetingCount ?? 0) > 0) {
    items.push({ id: "overdue-meetings", label: `${input.overdueMeetingCount} meeting${input.overdueMeetingCount === 1 ? "" : "s"} overdue`, route: "/meetings", source: "overdue-meeting" });
  }
  return items;
}

const insightTone: Record<"positive" | "neutral" | "warning", string> = {
  positive: "bg-emerald-500",
  neutral: "bg-[#5F6B73]",
  warning: "bg-amber-500",
};

export type DashboardSnapshotBarProps = {
  periods: DashboardSnapshotPeriods;
  actionQueue: EnterpriseWorkflowAction[];
  pendingAiReviewCount: number;
  overdueTaskCount?: number;
  overdueMeetingCount?: number;
};

export function DashboardSnapshotBar({ periods, actionQueue, pendingAiReviewCount, overdueTaskCount, overdueMeetingCount }: DashboardSnapshotBarProps) {
  const yoyEarliestActivityDate = periods.yoyEarliestActivityDate;
  const [tab, setTab] = useState<PeriodTab>("daily");
  const activeResult = tab === "yoy" ? undefined : periods[tab];
  const insights = deriveSnapshotInsights(periods.weekly);
  const actionables = buildActionablesFeed({ actionQueue, pendingAiReviewCount, overdueTaskCount, overdueMeetingCount });

  return (
    <SectionCard title="Snapshot" className="mb-0">
      <div className="mb-4 flex gap-1 border-b border-[rgba(0,0,0,0.08)]">
        {periodTabs.map((periodTab) => (
          <button
            key={periodTab.value}
            type="button"
            onClick={() => setTab(periodTab.value)}
            className={`text-xs px-3 py-2 font-semibold border-b-2 -mb-px transition-colors ${tab === periodTab.value ? "border-[#8B1E2D] text-[#8B1E2D]" : "border-transparent text-[#5F6B73] hover:text-[#0F1117]"}`}
          >
            {periodTab.label}
          </button>
        ))}
      </div>

      {tab === "yoy" ? (
        <EmptyState
          title="Not enough history yet"
          message={yoyEarliestActivityDate
            ? `Year-over-year comparison needs 12 months of data -- AXXESS TRIaxis has been recording activity for this organization since ${new Date(yoyEarliestActivityDate).toLocaleDateString()}.`
            : "Year-over-year comparison needs 12 months of data -- not enough activity has been recorded for this organization yet."}
        />
      ) : activeResult ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {metricsFor(activeResult, periodNoun[tab]).map((metric) => (
            <MetricCard key={metric.label} label={metric.label} value={metric.value} detail={metric.detail} state="Live" />
          ))}
        </div>
      ) : (
        <p className="text-xs text-[#5F6B73]">Loading...</p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SectionCard title="Insights">
          {insights.length === 0 ? (
            <p className="text-xs text-[#5F6B73]">No notable change to report yet.</p>
          ) : (
            <ul className="space-y-2">
              {insights.map((insight) => (
                <li key={insight.id} className="flex items-start gap-2 text-xs leading-relaxed text-[#0F1117]">
                  <span className={`mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full ${insightTone[insight.tone]}`} aria-hidden="true" />
                  {insight.text}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        <SectionCard title="Actionables">
          {actionables.length === 0 ? (
            <p className="text-xs text-[#5F6B73]">Nothing needs your attention right now.</p>
          ) : (
            <ul className="space-y-1.5">
              {actionables.map((actionable) => (
                <li key={actionable.id}>
                  <a href={actionable.route} className="block rounded-lg px-2 py-1.5 text-xs font-medium text-[#0F1117] hover:bg-[#F2F3F5]">
                    {actionable.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </SectionCard>
  );
}
