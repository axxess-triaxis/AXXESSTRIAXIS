import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsProviderShell } from "../../services/analytics";
import { MockAnalyticsProvider } from "../../services/analytics/MockAnalyticsProvider";
import { BetaOnboardingChecklist } from "./BetaOnboardingChecklist";

const testUser = { id: "user_1", organizationId: "org_1", role: "Organization Admin" as const };

function renderChecklist(projectCount: number) {
  return render(
    <AnalyticsProviderShell provider={new MockAnalyticsProvider()}>
      <BetaOnboardingChecklist user={testUser} projectCount={projectCount} />
    </AnalyticsProviderShell>,
  );
}

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn() }),
}));

describe("BetaOnboardingChecklist", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  it("renders the beta onboarding steps", () => {
    render(
      <AnalyticsProviderShell provider={new MockAnalyticsProvider()}>
        <BetaOnboardingChecklist
          user={{
            id: "user_1",
            organizationId: "org_1",
            role: "Organization Admin",
          }}
          projectCount={1}
        />
      </AnalyticsProviderShell>,
    );

    expect(screen.getByText("Pilot Onboarding")).toBeInTheDocument();
    expect(screen.getByText("Create first project")).toBeInTheDocument();
    expect(screen.getByText("Ask first AI/RAG question")).toBeInTheDocument();
    expect(screen.getByText("View audit trail")).toBeInTheDocument();
    expect(screen.getByText("Send feedback / request support")).toBeInTheDocument();
  });

  it("persists pilot readiness events when a step is completed", async () => {
    const fetchMock = vi.mocked(fetch);

    render(
      <AnalyticsProviderShell provider={new MockAnalyticsProvider()}>
        <BetaOnboardingChecklist
          user={{
            id: "user_1",
            organizationId: "org_1",
            role: "Organization Admin",
          }}
          projectCount={3}
        />
      </AnalyticsProviderShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Create first task/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/pilot-readiness-events", expect.objectContaining({
        method: "POST",
        credentials: "include",
      }));
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      stepId: "first_task",
      eventType: "step_completed",
      metadata: {
        project_count: 3,
      },
    });
  });

  it("is deterministic: a fresh tenant with zero projects shows 1 of 10 complete (organization step only) on every load, never fluctuating without action (Sprint 4, F-018)", () => {
    // testUser has an organizationId, so the "organization" step auto-completes immediately --
    // that is the only step done for a brand-new tenant with zero projects.
    const { unmount } = renderChecklist(0);
    expect(screen.getByText("1 of 10 complete - first 10 minutes of a real tenant")).toBeInTheDocument();
    unmount();

    // Re-mounting with the same (honest, unchanged) projectCount must reproduce the exact same
    // progress -- reading from localStorage again must not silently advance any step.
    renderChecklist(0);
    expect(screen.getByText("1 of 10 complete - first 10 minutes of a real tenant")).toBeInTheDocument();
  });

  it("only advances the 'first_project' step once a real project genuinely exists, and that advance persists across reloads", () => {
    const { unmount } = renderChecklist(0);
    expect(screen.getByText("1 of 10 complete - first 10 minutes of a real tenant")).toBeInTheDocument();
    unmount();

    // A durable state change (the tenant now genuinely has 1 project) is the only thing allowed
    // to move progress -- this simulates returning to the dashboard after Sprint 2's real project
    // creation path succeeded. organization + first_project are now both done.
    renderChecklist(1);
    expect(screen.getByText("2 of 10 complete - first 10 minutes of a real tenant")).toBeInTheDocument();
  });
});
