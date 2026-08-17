import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnalyticsProviderShell } from "../../services/analytics";
import { MockAnalyticsProvider } from "../../services/analytics/MockAnalyticsProvider";

// A-35 fix: "Submit Feedback" used to succeed with no reviewable destination anywhere in the app --
// betaFeedbackRepository.list() was only ever reduced to a count. This proves the new Feedback
// Inbox on this (admin-only) page actually renders individual submissions, not just a metric.
type FeedbackRow = {
  id: string;
  organizationId: string;
  userId: string;
  feedbackType: "Bug" | "Feature Request" | "Confusing Workflow" | "General Feedback";
  module: string;
  rating: number;
  message: string;
  permissionToContact: boolean;
  status: "new" | "triaged" | "in-review" | "resolved" | "closed";
  metadata: Record<string, unknown>;
  createdAt: string;
};

const state = {
  feedback: [] as FeedbackRow[],
  users: [] as Array<{ id: string; organizationId: string; displayName: string; email: string; role: string; avatarInitials: string }>,
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
    usersRepository: { listByOrganization: async () => state.users },
    projectsRepository: { list: async () => [] },
    tasksRepository: { list: async () => [] },
    meetingsRepository: { list: async () => [] },
    betaFeedbackRepository: { list: async () => state.feedback },
  },
}));

import { ProductAnalyticsSection } from "./ProductAnalyticsSection";

function renderSection() {
  return render(
    <AnalyticsProviderShell provider={new MockAnalyticsProvider()}>
      <ProductAnalyticsSection />
    </AnalyticsProviderShell>,
  );
}

describe("ProductAnalyticsSection Feedback Inbox (A-35 fix)", () => {
  afterEach(() => {
    state.feedback = [];
    state.users = [];
  });

  it("renders individual submitted feedback with type, module, rating, message, and submitter", async () => {
    state.users = [{ id: "user-1", organizationId: "org-1", displayName: "Jamie Rivera", email: "jamie@example.com", role: "Employee", avatarInitials: "JR" }];
    state.feedback = [{
      id: "feedback-1",
      organizationId: "org-1",
      userId: "user-1",
      feedbackType: "Bug",
      module: "Documents",
      rating: 2,
      message: "Upload button did nothing on Safari.",
      permissionToContact: true,
      status: "new",
      metadata: {},
      createdAt: "2026-07-27T10:00:00.000Z",
    }];

    renderSection();

    await waitFor(() => {
      expect(screen.getByText("Feedback Inbox")).toBeInTheDocument();
    });

    expect(screen.getByText("Upload button did nothing on Safari.")).toBeInTheDocument();
    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(screen.getByText("Rating 2/5")).toBeInTheDocument();
    expect(screen.getByText(/Jamie Rivera \(jamie@example.com\)/)).toBeInTheDocument();
  });

  it("shows an explicit empty state rather than nothing when there is no feedback yet", async () => {
    renderSection();

    await waitFor(() => {
      expect(screen.getByText("No feedback submitted yet.")).toBeInTheDocument();
    });
  });
});

// Founder-reported (2026-08-15): "Most Used Modules" and "Activation Funnel" rendered fabricated
// percentages/counts to every visitor, real tenant or demo, with no demoMode gate at all -- unlike
// every other fabricated block on this page (Engineering & Delivery Tooling, seeded Feedback Inbox),
// which are correctly gated. First fix (2026-08-15) made both sections honestly say "not wired yet"
// outside demo mode. Sprint (2026-08-17) replaced that placeholder with real data: Most Used Modules
// now reads /api/module-usage-events (written by App.tsx's module_opened effect on every real
// navigation), Activation Funnel now reads the same /api/pilot-readiness-events
// PilotConversionSection.tsx already uses. With no fetch stub (the default, unmocked jsdom fetch
// resolves to a failure caught by the route's own `.catch(() => undefined)`), both stay at their
// honest empty state -- a real tenant with genuinely zero events, not a fabricated number.
describe("ProductAnalyticsSection Most Used Modules / Activation Funnel (real data, not a fixture)", () => {
  afterEach(() => {
    state.feedback = [];
    state.users = [];
    vi.unstubAllGlobals();
  });

  it("shows an honest empty state for Most Used Modules when no module usage events exist yet, never a fabricated percentage", async () => {
    renderSection();

    await waitFor(() => {
      expect(screen.getByText("Most Used Modules")).toBeInTheDocument();
    });
    expect(screen.getByText("No module activity recorded yet.")).toBeInTheDocument();
    expect(screen.queryByText("92%")).not.toBeInTheDocument();
  });

  it("shows an honest empty state for Activation Funnel when no pilot readiness events exist yet, never a fabricated step count", async () => {
    renderSection();

    await waitFor(() => {
      expect(screen.getByText("Activation Funnel")).toBeInTheDocument();
    });
    expect(screen.getByText("No activation events recorded yet.")).toBeInTheDocument();
    expect(screen.queryByText("Signed in")).not.toBeInTheDocument();
  });

  it("renders real per-module counts from /api/module-usage-events, sorted by usage", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/module-usage-events")) {
        return {
          ok: true,
          json: async () => [
            { module: "dashboard" }, { module: "dashboard" }, { module: "dashboard" },
            { module: "projects" },
          ],
        };
      }
      return { ok: true, json: async () => [] };
    }));

    renderSection();

    await waitFor(() => {
      expect(screen.getByText("dashboard")).toBeInTheDocument();
    });
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("projects")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.queryByText("No module activity recorded yet.")).not.toBeInTheDocument();
  });

  it("renders real per-step counts from /api/pilot-readiness-events, counting distinct users per step", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/pilot-readiness-events")) {
        return {
          ok: true,
          json: async () => [
            { userId: "user-1", stepId: "organization", eventType: "step_completed" },
            { userId: "user-2", stepId: "organization", eventType: "step_completed" },
            { userId: "user-1", stepId: "first_project", eventType: "step_completed" },
            { userId: "user-1", stepId: "first_project", eventType: "step_reopened" },
          ],
        };
      }
      return { ok: true, json: async () => [] };
    }));

    renderSection();

    await waitFor(() => {
      expect(screen.getByText("Confirm organization")).toBeInTheDocument();
    });
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Create first project")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.queryByText("No activation events recorded yet.")).not.toBeInTheDocument();
  });
});

// Sprint 1 pilot portfolio (2026-08-15): the old A-96 devToolDashboards fixture (hardcoded GitHub/
// Linear/Vercel/Asana/Jira stats, self-documented as never a live integration) is replaced by real
// Sentry/PostHog/Mixpanel/Asana tiles sourced from the same /api/admin/pilot-portfolio route
// PilotConversionSection.tsx uses. That route restricts its `integrations` field to the platform
// operator's own Super Admin -- a regular tenant admin (every case this jsdom test env can exercise
// without mocking fetch) gets a 403/failed fetch and correctly keeps the honest "not wired yet"
// fallback, same discipline as the Most Used Modules/Activation Funnel fix above.
describe("ProductAnalyticsSection Engineering & Delivery Tooling (real integrations, not a fixture)", () => {
  afterEach(() => {
    state.feedback = [];
    state.users = [];
    vi.unstubAllGlobals();
  });

  it("shows an honest not-wired-yet message for a regular tenant admin, never the old fabricated GitHub/Linear/Vercel/Jira stats", async () => {
    renderSection();

    await waitFor(() => {
      expect(screen.getByText("Engineering & Delivery Tooling")).toBeInTheDocument();
    });
    expect(screen.getByText(/Sentry, PostHog, Mixpanel, and Asana dashboards require live API integrations/)).toBeInTheDocument();
    expect(screen.queryByText("142")).not.toBeInTheDocument(); // old fixture's fabricated GitHub commit count
  });

  it("renders real Sentry/PostHog/Mixpanel/Asana tiles for the platform operator, with an honest Not-connected state where a provider lacks credentials", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/admin/pilot-portfolio")) {
        return {
          ok: true,
          json: async () => ({
            snapshot: { generatedAt: "2026-08-15T00:00:00.000Z", dataState: "empty", tenants: [] },
            integrations: {
              sentry: { status: "ok", provider: "sentry", issuesLast24h: 3, unresolvedIssues: 1 },
              postHogQuery: { status: "not-configured", provider: "none" },
              mixpanelQuery: { status: "not-configured", provider: "none" },
              asana: { status: "not-configured", provider: "none" },
            },
          }),
        };
      }
      return { ok: true, json: async () => [] };
    }));

    renderSection();

    await waitFor(() => {
      expect(screen.getByText("Sentry")).toBeInTheDocument();
    });
    expect(screen.getAllByText("Live").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Not connected").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("PostHog (query)")).toBeInTheDocument();
    expect(screen.getByText("Mixpanel (query)")).toBeInTheDocument();
    expect(screen.getByText("Asana")).toBeInTheDocument();
  });
});
