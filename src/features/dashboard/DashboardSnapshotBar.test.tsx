import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardSnapshotBar, buildActionablesFeed } from "./DashboardSnapshotBar";
import type { DashboardSnapshotPeriods } from "../../hooks/useDashboardSnapshotPeriods";
import type { SnapshotPeriodCounts, SnapshotPeriodResult } from "../../services/dashboard/dashboardSnapshotPeriods";

function counts(overrides: Partial<SnapshotPeriodCounts> = {}): SnapshotPeriodCounts {
  return {
    tasksCreated: 0,
    tasksCompleted: 0,
    meetingsHeld: 0,
    aiReviewsCreated: 0,
    aiReviewsDecided: 0,
    aiReviewsEscalated: 0,
    documentsAdded: 0,
    auditEvents: 0,
    workflowEvents: 0,
    ...overrides,
  };
}

function periodResult(
  period: "daily" | "weekly" | "monthly",
  current: Partial<SnapshotPeriodCounts> = {},
  previous: Partial<SnapshotPeriodCounts> = {},
): SnapshotPeriodResult {
  return {
    period,
    window: { start: "2026-08-08T00:00:00.000Z", end: "2026-08-09T00:00:00.000Z", previousStart: "2026-08-07T00:00:00.000Z", previousEnd: "2026-08-08T00:00:00.000Z" },
    current: counts(current),
    previous: counts(previous),
  };
}

const fullPeriods: DashboardSnapshotPeriods = {
  daily: periodResult("daily", { tasksCreated: 3 }),
  // previous must carry some real activity here -- an all-zero previous period makes
  // deriveSnapshotInsights collapse to the "not enough activity" case instead of a real delta.
  weekly: periodResult("weekly", { tasksCreated: 10, aiReviewsEscalated: 2 }, { tasksCreated: 6, aiReviewsEscalated: 0 }),
  monthly: periodResult("monthly", { tasksCreated: 40 }),
  yoyEarliestActivityDate: "2026-07-02T00:00:00.000Z",
};

describe("DashboardSnapshotBar (A-110)", () => {
  it("renders all 6 sub-section labels", () => {
    render(<DashboardSnapshotBar periods={fullPeriods} actionQueue={[]} pendingAiReviewCount={0} />);
    expect(screen.getByText("Snapshot")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Daily" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Weekly" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Monthly" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Year on Year" })).toBeInTheDocument();
    expect(screen.getByText("Insights")).toBeInTheDocument();
    expect(screen.getByText("Actionables")).toBeInTheDocument();
  });

  it("defaults to the Daily tab and shows real metric values", () => {
    render(<DashboardSnapshotBar periods={fullPeriods} actionQueue={[]} pendingAiReviewCount={0} />);
    expect(screen.getByText("Tasks created")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("clicking a tab swaps the panel content to that period's real numbers", () => {
    render(<DashboardSnapshotBar periods={fullPeriods} actionQueue={[]} pendingAiReviewCount={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Weekly" }));
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("Year on Year tab shows the honest, tenant-specific empty state, not a fabricated comparison", () => {
    render(<DashboardSnapshotBar periods={fullPeriods} actionQueue={[]} pendingAiReviewCount={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Year on Year" }));
    expect(screen.getByText("Not enough history yet")).toBeInTheDocument();
    expect(screen.getByText(/recording activity for this organization since/)).toBeInTheDocument();
  });

  it("shows a loading state for a period that hasn't resolved yet", () => {
    render(<DashboardSnapshotBar periods={{}} actionQueue={[]} pendingAiReviewCount={0} />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("Insights shows the honest 'nothing notable' message when weekly data hasn't loaded", () => {
    render(<DashboardSnapshotBar periods={{}} actionQueue={[]} pendingAiReviewCount={0} />);
    expect(screen.getByText("No notable change to report yet.")).toBeInTheDocument();
  });

  it("Insights renders a real derived insight from weekly data", () => {
    render(<DashboardSnapshotBar periods={fullPeriods} actionQueue={[]} pendingAiReviewCount={0} />);
    expect(screen.getByText(/AI review.*escalated this week than last/)).toBeInTheDocument();
  });

  it("Actionables shows the honest empty message when nothing needs attention", () => {
    render(<DashboardSnapshotBar periods={fullPeriods} actionQueue={[]} pendingAiReviewCount={0} />);
    expect(screen.getByText("Nothing needs your attention right now.")).toBeInTheDocument();
  });

  it("Actionables renders real entries only when their source count is > 0", () => {
    render(
      <DashboardSnapshotBar
        periods={fullPeriods}
        actionQueue={[{ stepId: "invite_team", label: "Invite your team", route: "/settings?tab=users", status: "in_progress", reason: "No pending invitations yet" }]}
        pendingAiReviewCount={2}
        overdueTaskCount={0}
        overdueMeetingCount={1}
      />,
    );
    expect(screen.getByText("Invite your team")).toBeInTheDocument();
    expect(screen.getByText("2 AI reviews pending")).toBeInTheDocument();
    expect(screen.getByText("1 meeting overdue")).toBeInTheDocument();
    expect(screen.queryByText(/task.*overdue/)).not.toBeInTheDocument();
  });
});

describe("buildActionablesFeed (A-110 -- composed from existing signals, no new fetch)", () => {
  it("returns an empty feed when nothing needs attention", () => {
    expect(buildActionablesFeed({ actionQueue: [], pendingAiReviewCount: 0 })).toEqual([]);
  });

  it("includes golden-path actions verbatim", () => {
    const feed = buildActionablesFeed({
      actionQueue: [{ stepId: "connect_email", label: "Connect email", route: "/integrations", status: "in_progress", reason: "No mailbox connected" }],
      pendingAiReviewCount: 0,
    });
    expect(feed).toEqual([{ id: "golden-path-connect_email", label: "Connect email", route: "/integrations", source: "golden-path" }]);
  });

  it("adds pending-AI-review, overdue-task, and overdue-meeting entries only when their counts are positive", () => {
    const feed = buildActionablesFeed({ actionQueue: [], pendingAiReviewCount: 1, overdueTaskCount: 3, overdueMeetingCount: 0 });
    expect(feed.map((item) => item.source)).toEqual(["ai-review", "overdue-task"]);
  });
});
