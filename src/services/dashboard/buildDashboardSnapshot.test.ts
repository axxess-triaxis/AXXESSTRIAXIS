import { describe, expect, it } from "vitest";
import { buildDashboardSnapshot, type DashboardSnapshotInput } from "./buildDashboardSnapshot";

function baseInput(overrides: Partial<DashboardSnapshotInput> = {}): DashboardSnapshotInput {
  return {
    liveMetrics: {
      activeProjects: 0,
      openTasks: 0,
      pendingApprovals: 0,
      unreadNotifications: 0,
      ragReadyDocuments: 0,
      integrationConfigured: 0,
      socialAlerts: 0,
    },
    overdueTaskCount: 0,
    overdueMeetingCount: 0,
    pendingAiReviewCount: 0,
    auditLogCount: 0,
    socialAlertsAnyLiveProviderConfigured: false,
    workflowTimelineEventCount: 0,
    projects: [],
    demoMode: false,
    ...overrides,
  };
}

describe("buildDashboardSnapshot", () => {
  it("assigns every tile to tier 1, 2, or 3", () => {
    const tiles = buildDashboardSnapshot(baseInput());
    for (const tile of tiles) {
      expect([1, 2, 3]).toContain(tile.tier);
    }
  });

  it("includes real Tier 1 tiles alongside honest not-connected placeholders for unbuilt sources", () => {
    const tiles = buildDashboardSnapshot(baseInput());
    const byId = Object.fromEntries(tiles.map((tile) => [tile.id, tile]));

    expect(byId["overdue-tasks"].dataState).toBe("live");
    expect(byId["mail-inbox"].dataState).toBe("not-connected");
    expect(byId["mail-inbox"].value).toBe("Not connected yet");
    expect(byId["calendar-view"].dataState).toBe("not-connected");
    expect(byId["crm-leads-deals"].dataState).toBe("not-connected");
  });

  it("never fabricates a numeric value for a not-connected tile", () => {
    const tiles = buildDashboardSnapshot(baseInput());
    const notConnected = tiles.filter((tile) => tile.dataState === "not-connected");
    expect(notConnected.length).toBeGreaterThan(0);
    for (const tile of notConnected) {
      expect(tile.value).toBe("Not connected yet");
    }
  });

  it("marks a tile as partial (not live) when its underlying count has not loaded yet", () => {
    const tiles = buildDashboardSnapshot(baseInput({ overdueTaskCount: undefined }));
    const overdueTasks = tiles.find((tile) => tile.id === "overdue-tasks");
    expect(overdueTasks?.dataState).toBe("partial");
    expect(overdueTasks?.value).toBe("--");
  });

  it("escalates the overdue-tasks tile to a qualifying Urgent Attention score under a heavy backlog", () => {
    const tiles = buildDashboardSnapshot(baseInput({ overdueTaskCount: 20 }));
    const overdueTasks = tiles.find((tile) => tile.id === "overdue-tasks");
    expect(overdueTasks?.score).toBeGreaterThanOrEqual(16);
  });

  it("reflects real project risk into the project-health tile score", () => {
    const tiles = buildDashboardSnapshot(baseInput({
      projects: [{ risk: "urgent" }, { risk: "high" }, { risk: "low" }, { risk: "low" }],
    }));
    const projectHealth = tiles.find((tile) => tile.id === "project-health");
    expect(projectHealth?.value).toBe("2/4 at risk");
    expect(projectHealth?.dataState).toBe("live");
  });

  it("places the audit trail tile in Tier 3 and the document indexing tile in Tier 2", () => {
    const tiles = buildDashboardSnapshot(baseInput());
    expect(tiles.find((tile) => tile.id === "audit-log-gap")?.tier).toBe(3);
    expect(tiles.find((tile) => tile.id === "document-indexing-health")?.tier).toBe(2);
  });
});
