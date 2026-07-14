import { describe, expect, it } from "vitest";
import { buildPluginRuntimeSnapshot } from "../plugins/pluginRuntime";
import { buildEnterpriseReadinessSnapshot, buildDefaultUsageLimits, evaluateUsageLimit } from "./platformReadiness";

describe("platform readiness", () => {
  it("evaluates usage limits with hard-stop semantics", () => {
    const limit = evaluateUsageLimit({
      metric: "sandbox_runs",
      limit: 10,
      used: 12,
      window: "monthly",
      hardStop: true,
    });

    expect(limit.status).toBe("blocked");
    expect(limit.remaining).toBe(0);
  });

  it("builds enterprise readiness from plugin and usage posture", () => {
    const plugins = buildPluginRuntimeSnapshot({ organizationId: "org-1" });
    const snapshot = buildEnterpriseReadinessSnapshot({
      plugins,
      usage: buildDefaultUsageLimits("pilot", { ai_requests: 500 }),
    });

    expect(snapshot.score).toBeGreaterThanOrEqual(80);
    expect(snapshot.controls.some((control) => control.id === "plugin-runtime")).toBe(true);
    expect(snapshot.usage.find((usage) => usage.metric === "ai_requests")?.percentUsed).toBeGreaterThan(0);
  });
});
