import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../auth/AuthProvider";
import { AnalyticsProviderShell } from "../../services/analytics";
import { MockAnalyticsProvider } from "../../services/analytics/MockAnalyticsProvider";
import { AnalyticsSection } from "./AnalyticsSection";

// Sprint 3 (F-012) -- does not hang. A-96 (2026-08-04) briefly duplicated the Executive Dashboard's
// live Tier 1/2/3 scored-tile stack onto this page; corrected the same day -- Analytics owns its own
// distinct OKR/trend/risk/budget reporting, and no longer imports Dashboard's live tiles at all.
// Still uses the real AuthProvider/AnalyticsProviderShell wrapper and a stubbed-401 fetch since the
// page reads the authenticated session for its header badges.
describe("AnalyticsSection (Sprint 3 -- does not hang, F-012)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  async function renderAnalytics() {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ user: null }), { status: 401 })));
    render(
      <AnalyticsProviderShell provider={new MockAnalyticsProvider()}>
        <AuthProvider>
          <AnalyticsSection />
        </AuthProvider>
      </AnalyticsProviderShell>,
    );
    expect(await screen.findByText("Analytics & Reports")).toBeInTheDocument();
  }

  it("renders its content immediately, with no unresolved loading gate blocking the page", async () => {
    // The page itself resolves via renderAnalytics()'s findByText -- individual scored tiles may
    // transiently show their own "Loading" state text while live signals resolve, which is a
    // per-tile concept (DataStateBadge), not a page-blocking spinner, so it isn't asserted here.
    await renderAnalytics();
  });

  it("shows precise, per-section honest empty states outside Demo Mode, not a spinner", async () => {
    // Analytics Sprint 1: the old single blanket "Deeper OKR, budget-trend..." callout was
    // replaced with distinct empty states per section, since Projects and Approval Cycle Time
    // are now genuinely real for a live tenant while OKRs/budget remain honestly untracked.
    await renderAnalytics();

    expect(screen.getByText(/OKRs are not tracked in this platform yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Budget\/spend is not tracked in this platform yet/i)).toBeInTheDocument();
    expect(screen.getAllByText(/No decided approvals yet/i).length).toBeGreaterThan(0);
  });

  it("never duplicates the Executive Dashboard's live Tier 1/2/3 tile stack", async () => {
    await renderAnalytics();

    expect(screen.queryByText("Tier 1 · Executive & performance")).not.toBeInTheDocument();
    expect(screen.queryByText("Tier 2 · AI operating infrastructure & business intelligence")).not.toBeInTheDocument();
    expect(screen.queryByText("Tier 3 · Compliance, audit, governance & policy")).not.toBeInTheDocument();
  });

  it("shows real, interactive filter controls outside Demo Mode instead of the static demo buttons", async () => {
    // Analytics Sprint 2: outside Demo Mode, the filter row is now real <select> elements over
    // live project/approval data, not the decorative buttons Demo Mode keeps (different data
    // shape -- demo projects have no live `dept` field, so Demo Mode's row is left as-is).
    await renderAnalytics();

    expect(screen.getByLabelText("Filter by project")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter approval cycle time by time period")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by risk level")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by department")).toBeInTheDocument();
    expect(screen.getByText("Organization: this org")).toBeInTheDocument();
  });
});
