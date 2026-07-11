import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnalyticsProviderShell } from "../../services/analytics";
import { MockAnalyticsProvider } from "../../services/analytics/MockAnalyticsProvider";
import { BetaOnboardingChecklist } from "./BetaOnboardingChecklist";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn() }),
}));

describe("BetaOnboardingChecklist", () => {
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
});
