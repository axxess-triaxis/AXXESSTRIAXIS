import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnalyticsProviderShell } from "../../services/analytics";
import { MockAnalyticsProvider } from "../../services/analytics/MockAnalyticsProvider";

// Founder-reported (2026-08-15): a genuinely empty real tenant (zero pilot_readiness_events, not a
// demo session) on landing.triaxisventures.com was silently shown 8 fabricated demo events, stamped
// with its own real organizationId -- gated only by "the API response happened to be empty," not a
// real demoMode check. Same defect class already fixed once for listWorkflowTimeline
// (liveTenantWorkflow.timelineFallback.test.ts) but left open here. These tests prove the fix.
const state = {
  user: { id: "admin-1", organizationId: "org-1", role: "Organization Admin" as const },
  demoMode: false,
  fetchOk: true,
  events: [] as Array<{ id: string; organizationId: string; stepId: string; eventType: string; source: string; createdAt: string }>,
};

vi.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: state.user, status: "authenticated" } }),
}));

vi.mock("../../demo/demoMode", () => ({
  isDemoModeEnabled: () => state.demoMode,
}));

import { PilotConversionSection } from "./PilotConversionSection";

function renderSection() {
  return render(
    <AnalyticsProviderShell provider={new MockAnalyticsProvider()}>
      <PilotConversionSection />
    </AnalyticsProviderShell>,
  );
}

describe("PilotConversionSection real-vs-demo data (dummy-data fix)", () => {
  afterEach(() => {
    state.demoMode = false;
    state.fetchOk = true;
    state.events = [];
    vi.unstubAllGlobals();
  });

  it("shows an honest empty state for a genuinely empty real tenant, never fabricated demo events (not Demo Mode)", async () => {
    state.demoMode = false;
    state.events = [];
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => state.events })));

    renderSection();

    await waitFor(() => {
      expect(screen.getByText("No pilot events yet")).toBeInTheDocument();
    });
    // 0, not the 8 fabricated demo readiness events -- proves the fallback never fired.
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("still shows the seeded fallback timeline when Demo Mode is genuinely on and the API returns zero rows", async () => {
    state.demoMode = true;
    state.events = [];
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => state.events })));

    renderSection();

    // createDemoPilotReadinessEvents' first two seeded events use source "admin" -- the timeline
    // renders "<eventType> via <source>", so this text only appears when the actual fallback events
    // reached the feed, unlike the step labels (always listed in the checklist regardless of events).
    await waitFor(() => {
      expect(screen.getAllByText(/step_completed via admin/).length).toBeGreaterThan(0);
    });
    expect(screen.queryByText("No pilot events yet")).not.toBeInTheDocument();
  });

  it("renders real events when the API returns them, regardless of Demo Mode", async () => {
    state.demoMode = true;
    state.events = [{
      id: "real-1",
      organizationId: "org-1",
      stepId: "first_task",
      eventType: "step_completed",
      source: "web",
      createdAt: "2026-08-10T00:00:00.000Z",
    }];
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => state.events })));

    renderSection();

    await waitFor(() => {
      expect(screen.getByText("Create first task")).toBeInTheDocument();
    });
    expect(screen.queryByText(/Pilot Conversion uses live pilot readiness events/)).not.toBeInTheDocument();
  });

  it("does not fabricate demo events on a fetch failure for a real (non-demo) tenant", async () => {
    state.demoMode = false;
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network error"); }));

    renderSection();

    await waitFor(() => {
      expect(screen.getByText("No pilot events yet")).toBeInTheDocument();
    });
    expect(screen.queryByText(/Pilot Conversion uses live pilot readiness events/)).not.toBeInTheDocument();
  });
});

// Sprint 1 pilot portfolio (2026-08-15): the new cross-tenant Kanban section, restricted server-side
// to the platform operator's own Super Admin. These tests fake the /api/admin/pilot-portfolio route
// itself (a 403 for a regular tenant admin, a real snapshot for the operator) to prove the client
// renders (or fails closed) correctly in each case -- the actual authorization logic is covered by
// rbac.test.ts and route.test.ts, not re-tested here.
describe("PilotConversionSection Pilot Portfolio (cross-tenant Kanban)", () => {
  afterEach(() => {
    state.demoMode = false;
    state.fetchOk = true;
    state.events = [];
    vi.unstubAllGlobals();
  });

  function stubFetchByUrl(portfolioResponse: { ok: boolean; json?: () => Promise<unknown> }) {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/admin/pilot-portfolio")) {
        return portfolioResponse;
      }
      return { ok: true, json: async () => state.events };
    }));
  }

  it("renders the Kanban board with a real cross-tenant snapshot for the platform operator", async () => {
    stubFetchByUrl({
      ok: true,
      json: async () => ({
        snapshot: {
          generatedAt: "2026-08-15T00:00:00.000Z",
          dataState: "live",
          tenants: [{
            organizationId: "org_pilot_a",
            organizationName: "Pilot Org A",
            pilotUserCount: 6,
            onboarding: { score: 90, status: "Pilot-ready", completedSteps: 9, totalSteps: 10, completionPercent: 90, completedStepIds: [], missingStepIds: [], recommendations: [] },
            workflowStepsComplete: 7,
            workflowStepsTotal: 8,
          }],
        },
        integrations: {
          sentry: { status: "not-configured", provider: "none" },
          postHogQuery: { status: "not-configured", provider: "none" },
          mixpanelQuery: { status: "not-configured", provider: "none" },
          asana: { status: "not-configured", provider: "none" },
        },
      }),
    });

    renderSection();

    await waitFor(() => {
      expect(screen.getByText("Pilot Portfolio")).toBeInTheDocument();
    });
    expect(screen.getByText("Pilot Org A")).toBeInTheDocument();
    expect(screen.getAllByText("Not connected").length).toBeGreaterThan(0);
  });

  it("renders no Pilot Portfolio section at all for a regular tenant admin (403, fail-closed)", async () => {
    stubFetchByUrl({ ok: false });

    renderSection();

    await waitFor(() => {
      expect(screen.getByText("No pilot events yet")).toBeInTheDocument();
    });
    expect(screen.queryByText("Pilot Portfolio")).not.toBeInTheDocument();
  });
});
