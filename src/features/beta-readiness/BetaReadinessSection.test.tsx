import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnalyticsProviderShell } from "../../services/analytics";
import { MockAnalyticsProvider } from "../../services/analytics/MockAnalyticsProvider";

// A-96 (2026-08-04): Beta Readiness rebuild -- the founder-cleared static snapshot (Traction/
// Engineering/Outreach/Kanban sections) now sits alongside the pre-existing real per-tenant live
// metrics. These tests confirm both layers render, and that the snapshot is never silently editable
// outside the intended propagation loop (i.e. it renders exactly what betaReadinessSnapshot.ts
// exports, not fabricated inline data).
const state = {
  auditLogs: [] as Array<{ id: string; organizationId: string; action: string; category?: string; resourceType: string; createdAt: string }>,
};

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
    auditLogsRepository: { list: async () => state.auditLogs },
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
  afterEach(() => {
    state.auditLogs = [];
  });

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
    expect(screen.getByText("1,000+")).toBeInTheDocument();
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

  it("renders the real pilot testimonial with its attribution", async () => {
    renderSection();

    await waitFor(() => expect(screen.getByText("Pilot Testimonial")).toBeInTheDocument());

    expect(screen.getByText(/Your pace and vision here are correct/)).toBeInTheDocument();
    expect(screen.getByText(/Prajnyan Ballav Goswami/)).toBeInTheDocument();
  });

  it("renders a real, clickable link to the public waitlist", async () => {
    renderSection();

    await waitFor(() => expect(screen.getByText("Public Waitlist")).toBeInTheDocument());

    const link = screen.getByRole("link", { name: /open waitlist page/i });
    expect(link).toHaveAttribute("href", "https://getlaunchlist.com/pages/axxess-triaxis-founders-club-edition");
  });

  it("still renders the real, live per-tenant metrics section separately from the static snapshot", async () => {
    renderSection();

    await waitFor(() => expect(screen.getByText("This Tenant (live)")).toBeInTheDocument());

    expect(screen.getByText("Recent Audit Logs")).toBeInTheDocument();
    expect(screen.getByText("No audit logs available")).toBeInTheDocument();
  });
});
