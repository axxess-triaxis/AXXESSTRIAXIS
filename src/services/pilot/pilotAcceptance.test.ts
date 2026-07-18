import { describe, expect, it } from "vitest";
import { getFallbackLiveWorkspaceMetrics } from "../live-platform/livePlatform";
import { buildPilotCommandCenterSnapshot } from "../platform/pilotCommandCenter";
import { buildEnterpriseGoldenPathSnapshot } from "../workflows/enterpriseGoldenPath";
import { buildPilotTenantAcceptanceSnapshot } from "./pilotAcceptance";
import { computePilotHealth, createDemoPilotReadinessEvents } from "./pilotHealth";

function buildSeededSnapshot(acceptedAt?: string) {
  const organizationId = "org_north_east_health_mission";
  const metrics = getFallbackLiveWorkspaceMetrics();
  const goldenPath = buildEnterpriseGoldenPathSnapshot({
    metrics,
    userRole: "Organization Admin",
    hasOrganization: true,
    hasProfile: true,
    pendingAiReviews: 3,
    connectedIntegrations: 3,
  });
  const pilotHealth = computePilotHealth(createDemoPilotReadinessEvents(organizationId));
  const commandCenter = buildPilotCommandCenterSnapshot({
    organizationId,
    userId: "user_demo_executive",
    userRole: "Organization Admin",
    seededPilotEvidence: true,
    generatedAt: "2026-07-18T00:00:00.000Z",
  });

  return buildPilotTenantAcceptanceSnapshot({
    organizationId,
    organizationName: "North East Health Mission",
    generatedAt: "2026-07-18T00:00:00.000Z",
    goldenPath,
    pilotHealth,
    commandCenter,
    metrics,
    acceptedAt,
  });
}

describe("pilot tenant acceptance", () => {
  it("turns the golden path into an acceptance checklist and live-ops handoff queue", () => {
    const snapshot = buildSeededSnapshot();

    expect(snapshot.organizationName).toBe("North East Health Mission");
    expect(snapshot.score).toBeGreaterThanOrEqual(70);
    expect(snapshot.criteria).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "tenant-and-profile", status: "accepted" }),
      expect.objectContaining({ id: "knowledge-and-rag", status: "accepted" }),
      expect.objectContaining({ id: "pilot-acceptance-record" }),
    ]));
    expect(snapshot.handoffs.some((handoff) => handoff.id === "sponsor-acceptance-review")).toBe(true);
    expect(snapshot.nextOperatorAction.route).toMatch(/^\/.+/);
  });

  it("marks the tenant accepted only after an operator records acceptance", () => {
    const snapshot = buildSeededSnapshot("2026-07-18T12:00:00.000Z");

    expect(snapshot.status).toBe("accepted");
    expect(snapshot.stage).toBe("live_operations");
    expect(snapshot.acceptedAt).toBe("2026-07-18T12:00:00.000Z");
  });

  it("blocks clean tenants until minimum pilot evidence exists", () => {
    const metrics = { ...getFallbackLiveWorkspaceMetrics(), ragReadyDocuments: 0, openTasks: 0, pendingApprovals: 0 };
    const goldenPath = buildEnterpriseGoldenPathSnapshot({
      metrics,
      userRole: "Organization Admin",
      hasOrganization: true,
      hasProfile: true,
      pendingAiReviews: 0,
      connectedIntegrations: 0,
    });
    const pilotHealth = computePilotHealth([]);
    const commandCenter = buildPilotCommandCenterSnapshot({
      organizationId: "clean-live-tenant",
      userId: "user-2",
      userRole: "Organization Admin",
      env: {} as NodeJS.ProcessEnv,
      generatedAt: "2026-07-18T00:00:00.000Z",
    });
    const snapshot = buildPilotTenantAcceptanceSnapshot({
      organizationId: "clean-live-tenant",
      goldenPath,
      pilotHealth,
      commandCenter,
      metrics,
    });

    expect(snapshot.status).toBe("blocked");
    expect(snapshot.blockedCount).toBeGreaterThan(0);
    expect(snapshot.criteria.some((item) => item.status === "needs_evidence")).toBe(true);
  });
});
