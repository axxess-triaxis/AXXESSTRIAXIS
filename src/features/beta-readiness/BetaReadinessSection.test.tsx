import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnalyticsProviderShell } from "../../services/analytics";
import { MockAnalyticsProvider } from "../../services/analytics/MockAnalyticsProvider";

// A-96 (2026-08-04): Beta Readiness rebuild -- the founder-cleared static snapshot (Traction/
// Engineering/Outreach/Kanban sections) now sits alongside the pre-existing real per-tenant live
// metrics. These tests confirm both layers render, and that the snapshot is never silently editable
// outside the intended propagation loop (i.e. it renders exactly what betaReadinessSnapshot.ts
// exports, not fabricated inline data).
vi.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: { id: "admin-1", organizationId: "org-1", role: "Organization Admin" }, status: "authenticated" } }),
}));

vi.mock("../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
}));

vi.mock("../../providers/serviceProvider", () => ({
  applicationServices: {
    organizationsRepository: { list: async () => [] },
    usersRepository: { listByOrganization: async () => [] },
    projectsRepository: { list: async () => [] },
    tasksRepository: { list: async () => [] },
    meetingsRepository: { list: async () => [] },
    betaFeedbackRepository: { list: async () => [] },
  },
}));

import { BetaReadinessSection } from "./BetaReadinessSection";
import { engineeringMetrics, readinessKanbans, tractionMetrics } from "./betaReadinessSnapshot";

function renderSection() {
  return render(
    <AnalyticsProviderShell provider={new MockAnalyticsProvider()}>
      <BetaReadinessSection />
    </AnalyticsProviderShell>,
  );
}

describe("BetaReadinessSection", () => {
  it("renders the founder-cleared Traction Snapshot metrics from betaReadinessSnapshot.ts", async () => {
    renderSection();

    await waitFor(() => expect(screen.getByText("Traction Snapshot")).toBeInTheDocument());

    // Some labels (e.g. "Signed LOIs") also appear as Kanban stage titles elsewhere on the page,
    // so assert presence via getAllByText rather than the single-match getByText.
    for (const metric of tractionMetrics) {
      expect(screen.getAllByText(metric.label).length).toBeGreaterThan(0);
    }
    // Values are only spot-checked for figures distinctive enough not to collide with unrelated
    // numbers elsewhere on the page (e.g. WorkflowStepCard step-index badges) -- this still proves
    // real snapshot data renders, without making the test fragile to incidental digit collisions.
    expect(screen.getByText("41 visitors")).toBeInTheDocument();
    expect(screen.getByText("82.61")).toBeInTheDocument();
    expect(screen.getByText("70%")).toBeInTheDocument();
    expect(screen.getByText("9/10")).toBeInTheDocument();
  });

  it("renders the Engineering Snapshot metrics", async () => {
    renderSection();

    await waitFor(() => expect(screen.getByText("Engineering Snapshot")).toBeInTheDocument());

    for (const metric of engineeringMetrics) {
      expect(screen.getByText(metric.label)).toBeInTheDocument();
    }
  });

  it("tags each snapshot card with its real provenance (Computed vs Founder-stated), not a single blended label", async () => {
    renderSection();

    await waitFor(() => expect(screen.getByText("Traction Snapshot")).toBeInTheDocument());

    expect(screen.getAllByText("Computed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Founder-stated").length).toBeGreaterThan(0);
  });

  it("renders all four readiness Kanbans with their band and stages", async () => {
    renderSection();

    await waitFor(() => expect(screen.getByText("Readiness Kanbans")).toBeInTheDocument());

    for (const kanban of readinessKanbans) {
      expect(screen.getByText(kanban.title)).toBeInTheDocument();
      // Bands are not unique strings (Product and Market Readiness share "84-90%"), so assert
      // presence via getAllByText rather than the single-match getByText.
      expect(screen.getAllByText(kanban.band).length).toBeGreaterThan(0);
    }
  });

  it("renders both real pilot testimonials with their attributions", async () => {
    renderSection();

    await waitFor(() => expect(screen.getByText("Pilot Testimonials")).toBeInTheDocument());

    expect(screen.getByText(/Your pace and vision here are correct/)).toBeInTheDocument();
    expect(screen.getByText(/Prajnyan Ballav Goswami/)).toBeInTheDocument();
    expect(screen.getByText(/agentic automation with human element/)).toBeInTheDocument();
    expect(screen.getByText(/Diksha Rajkhowa/)).toBeInTheDocument();
  });

  it("renders a real, clickable link to the public waitlist", async () => {
    renderSection();

    await waitFor(() => expect(screen.getByText("Public Waitlist")).toBeInTheDocument());

    const link = screen.getByRole("link", { name: /open waitlist page/i });
    expect(link).toHaveAttribute("href", "https://getlaunchlist.com/pages/axxess-triaxis-founders-club-edition");
  });

  // A-116 (2026-08-14): removed per the founder's direct live review -- "This Tenant (live)" mixed
  // a single demo tenant's raw, pageSize-capped counts (Projects/Tasks always showed "100," the
  // fetch cap, not a real total) into what's meant to be company-wide investor evidence. The
  // Release Status/Connections/Recent Errors cards were removed in the same pass: Release Status
  // duplicated a hardcoded, since-corrected version constant; Connections showed only 3 systems
  // against a real ~40-integration surface (misleadingly narrow); Recent Errors always read "No
  // recent errors recorded" regardless of real PostHog error-tracking data this program already
  // has -- a fabricated-by-omission claim. No test replaces this one; the removed content had no
  // remaining evidence-bearing purpose on this specific page.
  it("no longer renders the removed This Tenant (live) / Release Status / Connections / Recent Errors blocks", async () => {
    renderSection();

    await waitFor(() => expect(screen.getByText("Traction Snapshot")).toBeInTheDocument());

    expect(screen.queryByText("This Tenant (live)")).not.toBeInTheDocument();
    expect(screen.queryByText("Release Status")).not.toBeInTheDocument();
    expect(screen.queryByText("Connections")).not.toBeInTheDocument();
    expect(screen.queryByText("Recent Errors")).not.toBeInTheDocument();
  });
});
