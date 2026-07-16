import { describe, expect, it } from "vitest";
import { buildDashboardSnapshotDelta, type DashboardSnapshotRow } from "./dashboardSnapshotDeltas";

const current: DashboardSnapshotRow = {
  id: "11111111-1111-4111-8111-111111111111",
  organization_id: "org-1",
  generated_by_user_id: "user-1",
  score: 84,
  status: "pass",
  readiness_score: 91,
  workstreams: [{ status: "pass" }, { status: "warning" }],
  queues: [{ status: "requires_approval" }],
  created_at: "2026-07-16T10:00:00.000Z",
};

describe("dashboard snapshot deltas", () => {
  it("creates a baseline delta when there is no previous snapshot", () => {
    const delta = buildDashboardSnapshotDelta({
      current,
      timelineEvents: [{ id: "22222222-2222-4222-8222-222222222222" }],
    });

    expect(delta.scoreDelta).toBe(0);
    expect(delta.readinessDelta).toBe(0);
    expect(delta.statusChanged).toBe(false);
    expect(delta.keyChanges[0]?.label).toBe("baseline");
    expect(delta.metrics.linkedTimelineEvents).toBe(delta.timelineEventIds.length);
  });

  it("compares score, readiness and status against the previous snapshot", () => {
    const previous: DashboardSnapshotRow = {
      ...current,
      id: "33333333-3333-4333-8333-333333333333",
      score: 70,
      status: "warning",
      readiness_score: 82,
      created_at: "2026-07-15T10:00:00.000Z",
    };

    const delta = buildDashboardSnapshotDelta({ current, previous });

    expect(delta.scoreDelta).toBe(14);
    expect(delta.readinessDelta).toBe(9);
    expect(delta.statusChanged).toBe(true);
    expect(delta.keyChanges.map((change) => change.label)).toEqual([
      "command_center_score",
      "readiness_score",
      "status",
    ]);
  });
});
