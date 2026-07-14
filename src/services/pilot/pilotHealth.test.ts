import { describe, expect, it } from "vitest";
import { computePilotHealth, createDemoPilotReadinessEvents, pilotReadinessSteps, type PilotReadinessEvent } from "./pilotHealth";

describe("pilot health scoring", () => {
  it("scores the seeded pilot environment as sponsor-review ready", () => {
    const score = computePilotHealth(createDemoPilotReadinessEvents("org_nehm"));

    expect(score.completedSteps).toBe(8);
    expect(score.totalSteps).toBe(pilotReadinessSteps.length);
    expect(score.score).toBeGreaterThanOrEqual(80);
    expect(score.recommendations).toContain("Complete: View audit trail");
  });

  it("handles reopened steps by requiring a completed event", () => {
    const events: PilotReadinessEvent[] = [
      {
        id: "event_1",
        organizationId: "org_nehm",
        stepId: "organization",
        eventType: "step_reopened",
        source: "admin",
        createdAt: new Date().toISOString(),
      },
      {
        id: "event_2",
        organizationId: "org_nehm",
        stepId: "invite_team_member",
        eventType: "step_completed",
        source: "admin",
        createdAt: new Date().toISOString(),
      },
    ];

    const score = computePilotHealth(events);

    expect(score.completedStepIds).toEqual(["invite_team_member"]);
    expect(score.missingStepIds).toContain("organization");
    expect(score.status).toBe("Needs setup");
  });
});
