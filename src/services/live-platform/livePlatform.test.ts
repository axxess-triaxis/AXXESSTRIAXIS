import { describe, expect, it } from "vitest";
import { getFallbackLiveWorkspaceMetrics } from "./livePlatform";

describe("live dashboard fallbacks", () => {
  it("keeps investor dashboard populated before repository hydration", () => {
    const metrics = getFallbackLiveWorkspaceMetrics();
    expect(metrics.activeProjects).toBeGreaterThan(100);
    expect(metrics.ragReadyDocuments).toBeGreaterThanOrEqual(2200);
    expect(metrics.socialAlerts).toBeGreaterThan(0);
  });
});
