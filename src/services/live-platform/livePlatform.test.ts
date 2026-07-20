import { describe, expect, it } from "vitest";
import { getFallbackLiveWorkspaceMetrics, getZeroLiveWorkspaceMetrics } from "./livePlatform";

describe("live dashboard fallbacks", () => {
  it("keeps investor dashboard populated before repository hydration", () => {
    const metrics = getFallbackLiveWorkspaceMetrics();
    expect(metrics.activeProjects).toBeGreaterThan(100);
    expect(metrics.ragReadyDocuments).toBeGreaterThanOrEqual(2200);
    expect(metrics.socialAlerts).toBeGreaterThan(0);
  });

  it("never shows a real tenant fabricated demo numbers while loading or on fetch failure", () => {
    const metrics = getZeroLiveWorkspaceMetrics();
    expect(metrics).toEqual({
      activeProjects: 0,
      openTasks: 0,
      pendingApprovals: 0,
      unreadNotifications: 0,
      ragReadyDocuments: 0,
      integrationConfigured: 0,
      socialAlerts: 0,
    });
  });
});
