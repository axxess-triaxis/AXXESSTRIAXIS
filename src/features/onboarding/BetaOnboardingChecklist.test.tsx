import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsProviderShell } from "../../services/analytics";
import { MockAnalyticsProvider } from "../../services/analytics/MockAnalyticsProvider";
import { BetaOnboardingChecklist } from "./BetaOnboardingChecklist";

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
});
