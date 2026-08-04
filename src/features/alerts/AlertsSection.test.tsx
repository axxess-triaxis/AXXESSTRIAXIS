import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  user: { id: "user-1", organizationId: "org-1", role: "Employee" as const },
  createdTasks: [] as Array<Record<string, unknown>>,
};

vi.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: state.user, status: "authenticated" } }),
}));

vi.mock("../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
}));

vi.mock("../../providers/serviceProvider", () => ({
  applicationServices: {
    tasksRepository: {
      create: async (_scope: unknown, input: Record<string, unknown>) => {
        state.createdTasks.push(input);
        return { id: `task-${state.createdTasks.length}`, ...input };
      },
    },
  },
}));

import { AlertsSection } from "./AlertsSection";

describe("AlertsSection (Sprint 5 -- formal Social Alerts audit, closing the Sprint 3/4 informal-only gap)", () => {
  beforeEach(() => {
    // A-96 (2026-08-04): AlertsSection now embeds the real SocialAlertRulesPanel, which fetches
    // /api/social-alert-rules on mount -- stub it so that fetch resolves deterministically instead
    // of hitting an undefined fetch in jsdom (still handled safely by the panel's own catch, but
    // this avoids act() warnings and keeps the panel's own loading state out of these assertions).
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ rules: [] }), { status: 200 })));
  });

  afterEach(() => {
    window.localStorage.clear();
    state.createdTasks = [];
    vi.unstubAllGlobals();
  });

  it("renders its content immediately, with no unresolved loading gate blocking the page (confirms it cannot reproduce the original hang: no fetch, no async gate)", () => {
    render(<AlertsSection />);

    expect(screen.getByText("Social Alerts")).toBeInTheDocument();
    // The Alert Rules panel below has its own scoped, real fetch and its own "Loading rules..."
    // text -- a per-panel loading state, not a page-blocking gate (the original Sprint 5 bug this
    // test guards against). The page's own title/content render synchronously regardless.
  });

  it("shows an honest empty state outside Demo Mode instead of fabricated demo alerts", () => {
    render(<AlertsSection />);

    expect(screen.getByText(/isn't wired to a live provider or tenant-scoped repository yet/i)).toBeInTheDocument();
    expect(screen.queryByText("State budget note references district oxygen resilience grants")).not.toBeInTheDocument();
    expect(screen.queryByText(/active$/)).not.toBeInTheDocument();
  });

  it("shows the seeded, enterprise-scale demo alert queue with a count badge matching the actual list length once Demo Mode is enabled", () => {
    window.localStorage.setItem("axxess.demoMode.enabled", "true");
    render(<AlertsSection />);

    expect(screen.getAllByText("State budget note references district oxygen resilience grants").length).toBeGreaterThan(0);
    expect(screen.getByText("160 active")).toBeInTheDocument();
  });

  // Investor Demo interactivity pass (2026-07-24): the queue previously rendered dead buttons
  // (no onClick handler at all). These prove dismiss and convert-to-task are real interactions.
  it("paginates the queue instead of rendering all 160 alerts at once, with a working 'Show more' action", () => {
    window.localStorage.setItem("axxess.demoMode.enabled", "true");
    render(<AlertsSection />);

    expect(screen.getAllByText(/^Convert to task$/)).toHaveLength(20);
    fireEvent.click(screen.getByRole("button", { name: /show more/i }));
    expect(screen.getAllByText(/^(Convert to task|Task created)$/)).toHaveLength(40);
  });

  it("dismissing an alert removes it from the queue and updates the active count", () => {
    window.localStorage.setItem("axxess.demoMode.enabled", "true");
    render(<AlertsSection />);

    expect(screen.getByText("160 active")).toBeInTheDocument();
    // The 12-template seed repeats titles across 160 items, so several alerts legitimately share
    // a title (realistic for a real alert stream too) -- dismiss the first match by label.
    fireEvent.click(screen.getAllByLabelText(/dismiss state budget note/i)[0]);

    expect(screen.getByText("159 active")).toBeInTheDocument();
  });

  it("converting an alert to a task calls the real tasks repository and marks it converted", async () => {
    window.localStorage.setItem("axxess.demoMode.enabled", "true");
    render(<AlertsSection />);

    const convertButtons = screen.getAllByText(/^Convert to task$/);
    fireEvent.click(convertButtons[0]);

    await waitFor(() => expect(state.createdTasks).toHaveLength(1));
    expect(state.createdTasks[0].title).toContain("State budget note");
    expect(await screen.findByText("Task created")).toBeInTheDocument();
  });
});
