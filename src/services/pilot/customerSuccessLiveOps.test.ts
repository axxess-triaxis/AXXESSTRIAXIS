import { describe, expect, it } from "vitest";
import { getFallbackLiveWorkspaceMetrics } from "../live-platform/livePlatform";
import { buildEnterpriseGoldenPathSnapshot } from "../workflows/enterpriseGoldenPath";
import { buildPilotCommandCenterSnapshot } from "../platform/pilotCommandCenter";
import { buildPilotTenantAcceptanceSnapshot } from "./pilotAcceptance";
import { computePilotHealth, createDemoPilotReadinessEvents } from "./pilotHealth";
import { buildCustomerSuccessLiveOpsSnapshot } from "./customerSuccessLiveOps";

function snapshotFixture() {
  const metrics = getFallbackLiveWorkspaceMetrics();
  const goldenPath = buildEnterpriseGoldenPathSnapshot({
    metrics,
    userRole: "Organization Admin",
    hasOrganization: true,
    hasProfile: true,
    pendingAiReviews: 3,
    connectedIntegrations: 2,
  });
  const acceptance = buildPilotTenantAcceptanceSnapshot({
    organizationId: "org_north_east_health_mission",
    organizationName: "North East Health Mission",
    generatedAt: "2026-07-18T00:00:00.000Z",
    goldenPath,
    pilotHealth: computePilotHealth(createDemoPilotReadinessEvents("org_north_east_health_mission")),
    commandCenter: buildPilotCommandCenterSnapshot({
      organizationId: "org_north_east_health_mission",
      userId: "user_customer_success",
      userRole: "Organization Admin",
      seededPilotEvidence: true,
      generatedAt: "2026-07-18T00:00:00.000Z",
    }),
    metrics,
  });

  return { metrics, goldenPath, acceptance };
}

describe("customer success live-ops snapshot", () => {
  it("creates stuck-step recovery, SLA, and regional key posture for a tenant", () => {
    const { metrics, goldenPath, acceptance } = snapshotFixture();
    const snapshot = buildCustomerSuccessLiveOpsSnapshot({
      organizationId: "org_north_east_health_mission",
      organizationName: "North East Health Mission",
      generatedAt: "2026-07-18T00:00:00.000Z",
      metrics,
      goldenPath,
      acceptance,
    });

    expect(snapshot.organizationId).toBe("org_north_east_health_mission");
    expect(snapshot.recoveryItems.length).toBeGreaterThan(0);
    expect(snapshot.slaTimers.some((timer) => timer.timerKey === "ai-review-queue")).toBe(true);
    expect(snapshot.regionalKeyPolicies.map((policy) => policy.regionCode)).toEqual(["IN-NE", "GLOBAL-OAUTH", "DEMO"]);
    expect(snapshot.recommendations.length).toBeGreaterThan(2);
  });

  it("flags blocked golden-path steps for customer-success intervention", () => {
    const { metrics, goldenPath, acceptance } = snapshotFixture();
    const blockedGoldenPath = {
      ...goldenPath,
      steps: goldenPath.steps.map((step) => step.id === "workflow-action" ? { ...step, status: "blocked" as const } : step),
    };
    const snapshot = buildCustomerSuccessLiveOpsSnapshot({
      organizationId: "org_north_east_health_mission",
      metrics,
      goldenPath: blockedGoldenPath,
      acceptance,
    });

    expect(snapshot.status).toBe("blocked");
    expect(snapshot.recoveryItems.find((item) => item.workflowStepId === "workflow-action")?.severity).toBe("critical");
  });
});
