import { describe, expect, it } from "vitest";
import { buildPilotCommandCenterSnapshot } from "./pilotCommandCenter";

describe("pilot command center", () => {
  it("builds Sprint 22 and 23 operator evidence from existing platform primitives", () => {
    const snapshot = buildPilotCommandCenterSnapshot({
      organizationId: "north-east-health-mission",
      userId: "user-1",
      userRole: "Organization Admin",
      generatedAt: "2026-07-15T00:00:00.000Z",
      seededPilotEvidence: true,
    });

    expect(snapshot.sprintPlan.sprint22).toContain("Pilot Command Center");
    expect(snapshot.sprintPlan.sprint23).toContain("Governed AI operations");
    expect(snapshot.score).toBeGreaterThanOrEqual(60);
    expect(snapshot.readinessScore).toBeGreaterThanOrEqual(80);
    expect(snapshot.pluginRuntime.configured).toBeGreaterThanOrEqual(3);
    expect(snapshot.executionRuntime.totalRuns).toBe(1);
    expect(snapshot.ragEvaluation.fixtures).toBeGreaterThanOrEqual(2);
    expect(snapshot.queues.some((item) => item.type === "connector_action")).toBe(true);
    expect(snapshot.queues.some((item) => item.type === "ai_review" && item.status === "requires_approval")).toBe(true);
  });

  it("surfaces provider gaps without crossing tenant boundaries", () => {
    const snapshot = buildPilotCommandCenterSnapshot({
      organizationId: "clean-live-tenant",
      userId: "user-2",
      userRole: "Organization Admin",
      generatedAt: "2026-07-15T00:00:00.000Z",
      env: {} as NodeJS.ProcessEnv,
    });

    expect(snapshot.organizationId).toBe("clean-live-tenant");
    expect(snapshot.queues.find((item) => item.id === "connector-gmail-reviewed-task")?.status).toBe("blocked");
    expect(snapshot.workstreams.every((workstream) => workstream.evidence.length > 0)).toBe(true);
  });
});
