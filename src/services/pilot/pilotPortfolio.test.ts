import { describe, expect, it } from "vitest";
import { buildPilotPortfolioSnapshot, type PilotPortfolioReadinessEvent, type PilotPortfolioWorkflowProgressRow } from "./pilotPortfolio";

describe("buildPilotPortfolioSnapshot", () => {
  it("returns an empty, honest snapshot for no organizations", () => {
    const snapshot = buildPilotPortfolioSnapshot({
      organizations: [],
      pilotEvents: [],
      workflowProgress: [],
      userCountsByOrganizationId: {},
    });

    expect(snapshot.tenants).toEqual([]);
    expect(snapshot.dataState).toBe("empty");
  });

  it("computes per-tenant onboarding, workflow, and user-count rollups independently per organization", () => {
    const pilotEvents: PilotPortfolioReadinessEvent[] = [
      { id: "evt_1", organizationId: "org_a", stepId: "organization", eventType: "step_completed", source: "web", createdAt: "2026-08-01T00:00:00.000Z" },
      { id: "evt_2", organizationId: "org_a", stepId: "invite_team_member", eventType: "step_completed", source: "web", createdAt: "2026-08-02T00:00:00.000Z" },
      { id: "evt_3", organizationId: "org_b", stepId: "organization", eventType: "step_completed", source: "web", createdAt: "2026-08-03T00:00:00.000Z" },
    ];
    const workflowProgress: PilotPortfolioWorkflowProgressRow[] = [
      { organizationId: "org_a", stepId: "organization-setup", status: "complete" },
      { organizationId: "org_a", stepId: "team-provisioning", status: "complete" },
      { organizationId: "org_a", stepId: "knowledge-ingestion", status: "active" },
      { organizationId: "org_b", stepId: "organization-setup", status: "not_started" },
    ];

    const snapshot = buildPilotPortfolioSnapshot({
      organizations: [
        { id: "org_a", name: "Org A" },
        { id: "org_b", name: "Org B" },
      ],
      pilotEvents,
      workflowProgress,
      userCountsByOrganizationId: { org_a: 12, org_b: 3 },
    });

    expect(snapshot.dataState).toBe("live");
    expect(snapshot.tenants).toHaveLength(2);

    const orgA = snapshot.tenants.find((tenant) => tenant.organizationId === "org_a");
    expect(orgA?.pilotUserCount).toBe(12);
    expect(orgA?.workflowStepsComplete).toBe(2);
    expect(orgA?.workflowStepsTotal).toBe(8);
    expect(orgA?.onboarding.completedSteps).toBe(2);

    const orgB = snapshot.tenants.find((tenant) => tenant.organizationId === "org_b");
    expect(orgB?.pilotUserCount).toBe(3);
    expect(orgB?.workflowStepsComplete).toBe(0);
    expect(orgB?.onboarding.completedSteps).toBe(1);
  });

  it("defaults a missing user count to zero rather than throwing or fabricating a number", () => {
    const snapshot = buildPilotPortfolioSnapshot({
      organizations: [{ id: "org_c", name: "Org C" }],
      pilotEvents: [],
      workflowProgress: [],
      userCountsByOrganizationId: {},
    });

    expect(snapshot.tenants[0].pilotUserCount).toBe(0);
  });
});
