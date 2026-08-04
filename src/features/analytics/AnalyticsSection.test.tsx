import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../auth/AuthProvider";
import { AnalyticsProviderShell } from "../../services/analytics";
import { MockAnalyticsProvider } from "../../services/analytics/MockAnalyticsProvider";
import { AnalyticsSection } from "./AnalyticsSection";

// Sprint 3 (F-012) -- does not hang. A-96 (2026-08-04) extended this page to share the Executive
// Dashboard's live Tier 1/2/3 scored-tile stack (useDashboardSnapshot), so it now needs the same
// real AuthProvider/AnalyticsProviderShell wrapper and stubbed-401 fetch as DashboardSection.test.tsx
// -- a full authenticated render needs the entire repository/provider stack.
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

  it("shows the honest not-yet-connected empty state for deeper trend analytics outside Demo Mode, not a spinner", async () => {
    await renderAnalytics();

    expect(screen.getByText(/Deeper OKR, budget-trend, and approval-cycle analytics require computation/i)).toBeInTheDocument();
  });

  it("still renders the live Tier 1/2/3 scored tile stack for a real tenant, same as the Executive Dashboard", async () => {
    await renderAnalytics();

    expect(screen.getByText("Tier 1 · Executive & performance")).toBeInTheDocument();
    expect(screen.getByText("Tier 2 · AI operating infrastructure & business intelligence")).toBeInTheDocument();
    expect(screen.getByText("Tier 3 · Compliance, audit, governance & policy")).toBeInTheDocument();
  });
});
