import { afterEach, describe, expect, it, vi } from "vitest";
import type { UserContext } from "../../security/rbac";

// TP-2 (2026-07-28): buildPilotAcceptanceRuntimeSnapshot used to hardcode
// organizationName: "North East Health Mission" unconditionally, so a real tenant's Pilot Command
// Center / Customer Success Live Ops admin pages showed the demo institution's name regardless of
// who was signed in -- the same failure class as A-28. These tests lock in the fix.
const state = {
  organization: undefined as { id: string; name: string; slug: string; sector: string; createdAt: string; updatedAt: string } | undefined,
};

vi.mock("../../providers/serviceProvider", () => ({
  applicationServices: {
    organizationsRepository: { getById: async () => state.organization },
  },
}));

vi.mock("../../repositories/pilotAcceptanceRepository", () => ({
  listPilotReadinessEventsForAcceptance: async () => [],
}));

vi.mock("../live-platform/livePlatform", () => ({
  getLiveWorkspaceMetrics: async () => { throw new Error("no live metrics in test"); },
  getFallbackLiveWorkspaceMetrics: () => ({ activeProjects: 0, openTasks: 0, pendingApprovals: 0, unreadNotifications: 0, ragReadyDocuments: 0, integrationConfigured: 0 }),
  getZeroLiveWorkspaceMetrics: () => ({ activeProjects: 0, openTasks: 0, pendingApprovals: 0, unreadNotifications: 0, ragReadyDocuments: 0, integrationConfigured: 0 }),
}));

import { buildPilotAcceptanceRuntimeSnapshot } from "./pilotAcceptanceRuntime";

function testUser(overrides: Partial<UserContext> = {}): UserContext {
  return { id: "user-1", organizationId: "org-1", role: "Organization Admin", ...overrides };
}

describe("buildPilotAcceptanceRuntimeSnapshot (TP-2 tenant/demo leakage fix)", () => {
  afterEach(() => {
    state.organization = undefined;
  });

  it("live (non-seeded) mode: uses the real organization's own name, not the seeded demo institution", async () => {
    state.organization = { id: "org-1", name: "Triaxis Ventures Private Limited", slug: "triaxis-ventures", sector: "enterprise", createdAt: "2026-07-24T00:00:00.000Z", updatedAt: "2026-07-24T00:00:00.000Z" };

    const snapshot = await buildPilotAcceptanceRuntimeSnapshot({
      user: testUser(),
      env: { NEXT_PUBLIC_AXXESS_DEMO_MODE: "false" } as NodeJS.ProcessEnv,
    });

    expect(snapshot.organizationName).toBe("Triaxis Ventures Private Limited");
    expect(snapshot.organizationName).not.toBe("North East Health Mission");
  });

  it("live mode, no organization record yet: shows an honest placeholder, never the demo fallback", async () => {
    state.organization = undefined;

    const snapshot = await buildPilotAcceptanceRuntimeSnapshot({
      user: testUser(),
      env: { NEXT_PUBLIC_AXXESS_DEMO_MODE: "false" } as NodeJS.ProcessEnv,
    });

    expect(snapshot.organizationName).toBe("Organization setup pending");
    expect(snapshot.organizationName).not.toBe("North East Health Mission");
  });

  it("build-time-forced demo deployment: still shows the seeded institution, unaffected by the fix", async () => {
    state.organization = { id: "org-1", name: "Real Org", slug: "real-org", sector: "enterprise", createdAt: "2026-07-24T00:00:00.000Z", updatedAt: "2026-07-24T00:00:00.000Z" };

    const snapshot = await buildPilotAcceptanceRuntimeSnapshot({
      user: testUser(),
      env: { NEXT_PUBLIC_AXXESS_DEMO_MODE: "true" } as NodeJS.ProcessEnv,
    });

    expect(snapshot.organizationName).toBe("North East Health Mission");
  });
});
