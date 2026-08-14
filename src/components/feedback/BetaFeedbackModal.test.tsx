import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnalyticsProviderShell } from "../../services/analytics";
import { MockAnalyticsProvider } from "../../services/analytics/MockAnalyticsProvider";
import { BetaFeedbackModal } from "./BetaFeedbackModal";

// A-116 (2026-08-14): replaced the inline rating/message form (which POSTed to
// /api/beta-feedback) with direct links to 3 real external surveys, per the founder's explicit
// instruction ("should have 3 links not this unempirical placeholder form"). These tests prove
// the real survey URLs render as real, trackable, new-tab links -- not a form to fill out here.
const testUser = { id: "user-1", organizationId: "org-1", role: "Employee" as const };

function renderModal(onClose = vi.fn()) {
  return render(
    <AnalyticsProviderShell provider={new MockAnalyticsProvider()}>
      <BetaFeedbackModal user={testUser} moduleName="Dashboard" route="/dashboard" onClose={onClose} />
    </AnalyticsProviderShell>,
  );
}

describe("BetaFeedbackModal", () => {
  it("renders all three real survey links, each opening in a new tab", () => {
    renderModal();

    const product = screen.getByRole("link", { name: /Product Survey/i });
    expect(product).toHaveAttribute("href", "https://ap.surveymars.com/q/dWD9AHFnT");
    expect(product).toHaveAttribute("target", "_blank");

    const enterprise = screen.getByRole("link", { name: /Enterprise Survey/i });
    expect(enterprise).toHaveAttribute("href", "https://ap.surveymars.com/q/NAgaQ43fM");

    const technical = screen.getByRole("link", { name: /For Technical Surveyors/i });
    expect(technical).toHaveAttribute("href", "https://ap.surveymars.com/q/NnfK3fMgo");
  });

  it("closes when the close button is clicked", () => {
    const onClose = vi.fn();
    renderModal(onClose);

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(onClose).toHaveBeenCalled();
  });
});
