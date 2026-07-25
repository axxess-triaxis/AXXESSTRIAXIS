import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../auth/AuthProvider";
import { demoModeStorageKey } from "../../demo/demoMode";
import { AnalyticsProviderShell } from "../../services/analytics";
import { MockAnalyticsProvider } from "../../services/analytics/MockAnalyticsProvider";
import { DashboardSection } from "./DashboardSection";

// Executive Dashboard Sprint ED-1 -- High-Visibility Dead Action Cleanup. These tests cover the
// specific dead-affordance fixes from that sprint: the removed feedback mailto, the renamed guided
// walkthrough button, the real command search, and the real export action. Project row/detail
// navigation (ED1-06/07) and the Refresh button's live-metrics refetch (ED1-04/05) are covered by
// liveWorkspaceMetricsCache.test.ts and useLiveWorkspaceMetrics.test.ts at the hook level, since a
// full authenticated render of this page needs the entire repository/provider stack.
describe("DashboardSection (Executive Dashboard Sprint ED-1)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  async function renderDashboard() {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ user: null }), { status: 401 })));
    render(
      <AnalyticsProviderShell provider={new MockAnalyticsProvider()}>
        <AuthProvider>
          <DashboardSection />
        </AuthProvider>
      </AnalyticsProviderShell>,
    );
    expect(await screen.findByText("Executive Dashboard")).toBeInTheDocument();
  }

  it("no longer shows a dead 'Send feedback' mailto in the header (ED1-01)", async () => {
    await renderDashboard();
    expect(screen.queryByText("Send feedback")).not.toBeInTheDocument();
  });

  it("renames 'Start guided demo' to 'Start guided setup' to avoid investor-demo confusion (ED1-10)", async () => {
    await renderDashboard();
    expect(screen.getByText("Start guided setup")).toBeInTheDocument();
    expect(screen.queryByText("Start guided demo")).not.toBeInTheDocument();
  });

  it("labels the pilot-request CTA as an external email action, not an in-app one (ED1-11)", async () => {
    await renderDashboard();
    const link = screen.getByText("Request pilot conversation").closest("a");
    expect(link?.getAttribute("href")).toContain("mailto:");
    expect(link).toHaveTextContent("Email");
  });

  it("renders a real, typeable command search instead of the decorative placeholder (ED1-13)", async () => {
    await renderDashboard();
    const input = screen.getByPlaceholderText("Search projects and priority actions");
    fireEvent.change(input, { target: { value: "nonexistent-query-xyz" } });
    expect(await screen.findByText(/No matches for/)).toBeInTheDocument();
  });

  it("Export Briefing downloads a real JSON snapshot, not a no-op click (ED1-12)", async () => {
    await renderDashboard();
    const createObjectURL = vi.fn(() => "blob:mock-url");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    fireEvent.click(screen.getByText("Export Briefing"));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const [blob] = createObjectURL.mock.calls[0] as [Blob];
    expect(blob.type).toBe("application/json");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");

    clickSpy.mockRestore();
  });

  it("Project Health Monitor rows navigate to /projects, the honest option since no per-project detail route exists (ED1-06/07)", async () => {
    window.localStorage.setItem(demoModeStorageKey, "true");
    await renderDashboard();

    const viewAll = screen.getByText(/View All \d+/);
    expect(viewAll.closest("a")?.getAttribute("href")).toBe("/projects");
  });
});

// Executive Dashboard Sprint ED-3 -- Net-New Dashboard Intelligence MVPs. aggregateProjectRisk and
// deriveDashboardRecommendations' actual logic is covered directly in dashboardIntelligence.test.ts
// (they're exported pure functions); these tests confirm the honest-empty-state UI wiring for a
// real tenant with no data yet, which the pure-function tests alone don't exercise.
describe("DashboardSection (Executive Dashboard Sprint ED-3)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("Risk Heatmap shows an honest empty state for a real tenant with no projects, not a fabricated live heatmap (ED3-01)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ user: null }), { status: 401 })));
    render(
      <AnalyticsProviderShell provider={new MockAnalyticsProvider()}>
        <AuthProvider>
          <DashboardSection />
        </AuthProvider>
      </AnalyticsProviderShell>,
    );

    expect(await screen.findByText("Risk Heatmap")).toBeInTheDocument();
    expect(screen.getByText(/No projects yet\. Risk levels will appear here/)).toBeInTheDocument();
    // The old hardcoded, non-demo-gated health-specific categories must never render for a real tenant.
    expect(screen.queryByText("Oxygen")).not.toBeInTheDocument();
    expect(screen.queryByText("Referral")).not.toBeInTheDocument();
  });

  it("AI Recommendations shows an honest empty state for a real tenant with no evidence yet (ED3-03)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ user: null }), { status: 401 })));
    render(
      <AnalyticsProviderShell provider={new MockAnalyticsProvider()}>
        <AuthProvider>
          <DashboardSection />
        </AuthProvider>
      </AnalyticsProviderShell>,
    );

    expect(await screen.findByText("AI Recommendations")).toBeInTheDocument();
    expect(screen.getByText(/No recommendations yet\. Recommendations appear after/)).toBeInTheDocument();
  });

  it("Strategic Objectives shows an honest empty state for a real tenant with no programs yet (ED3-02)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ user: null }), { status: 401 })));
    render(
      <AnalyticsProviderShell provider={new MockAnalyticsProvider()}>
        <AuthProvider>
          <DashboardSection />
        </AuthProvider>
      </AnalyticsProviderShell>,
    );

    expect(await screen.findByText("Strategic Objectives")).toBeInTheDocument();
    expect(screen.getByText(/No strategic objectives configured yet/)).toBeInTheDocument();
  });

  it("labels the Pilot Onboarding checklist as personal/local-only, distinct from the Enterprise Golden Path (ED3-04)", async () => {
    window.localStorage.setItem(demoModeStorageKey, "true");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ user: null }), { status: 401 })));
    render(
      <AnalyticsProviderShell provider={new MockAnalyticsProvider()}>
        <AuthProvider>
          <DashboardSection />
        </AuthProvider>
      </AnalyticsProviderShell>,
    );

    const pilotHeading = await screen.findByText("Pilot Onboarding (personal checklist)");
    expect(pilotHeading).toBeInTheDocument();
    expect(screen.getByText(/saved to this browser only/)).toBeInTheDocument();
    expect(await screen.findByText("Enterprise golden path")).toBeInTheDocument();
  });
});
