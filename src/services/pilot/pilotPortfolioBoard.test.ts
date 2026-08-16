import { describe, expect, it } from "vitest";
import { buildPilotPortfolioColumns } from "./pilotPortfolioBoard";
import type { PilotTenantSnapshot } from "./pilotPortfolio";

function makeTenant(overrides: Partial<PilotTenantSnapshot>): PilotTenantSnapshot {
  return {
    organizationId: "org_x",
    organizationName: "Org X",
    pilotUserCount: 5,
    onboarding: {
      score: 50,
      status: "On track",
      completedSteps: 5,
      totalSteps: 10,
      completionPercent: 50,
      completedStepIds: [],
      missingStepIds: [],
      recommendations: [],
    },
    workflowStepsComplete: 2,
    workflowStepsTotal: 8,
    ...overrides,
  };
}

describe("buildPilotPortfolioColumns", () => {
  it("produces all 4 status columns, empty, for an empty tenant list -- not an error", () => {
    const columns = buildPilotPortfolioColumns([]);
    expect(columns).toHaveLength(4);
    expect(columns.map((column) => column.id)).toEqual(["Needs setup", "At risk", "On track", "Pilot-ready"]);
    columns.forEach((column) => expect(column.cards).toEqual([]));
  });

  it("places each tenant in the column matching its own computed onboarding status", () => {
    const tenants = [
      makeTenant({ organizationId: "org_a", organizationName: "Org A", onboarding: { ...makeTenant({}).onboarding, status: "Needs setup" } }),
      makeTenant({ organizationId: "org_b", organizationName: "Org B", onboarding: { ...makeTenant({}).onboarding, status: "Pilot-ready" } }),
    ];

    const columns = buildPilotPortfolioColumns(tenants);

    const needsSetup = columns.find((column) => column.id === "Needs setup");
    const pilotReady = columns.find((column) => column.id === "Pilot-ready");
    expect(needsSetup?.cards.map((card) => card.id)).toEqual(["org_a"]);
    expect(pilotReady?.cards.map((card) => card.id)).toEqual(["org_b"]);
  });

  it("renders real metrics on each card, not placeholders", () => {
    const tenant = makeTenant({ pilotUserCount: 12, workflowStepsComplete: 3, workflowStepsTotal: 8 });
    const columns = buildPilotPortfolioColumns([tenant]);
    const card = columns.find((column) => column.id === "On track")?.cards[0];

    expect(card?.metrics).toEqual([
      { label: "Pilot users", value: "12" },
      { label: "Onboarding", value: "5/10" },
      { label: "Workflows", value: "3/8" },
    ]);
  });

  it("shows an honest 'no activity' subtitle rather than a fabricated date", () => {
    const tenant = makeTenant({ lastActivityAt: undefined });
    const columns = buildPilotPortfolioColumns([tenant]);
    const card = columns.find((column) => column.id === "On track")?.cards[0];
    expect(card?.subtitle).toBe("No activity recorded yet");
  });
});
