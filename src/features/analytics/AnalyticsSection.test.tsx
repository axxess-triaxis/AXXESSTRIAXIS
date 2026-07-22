import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnalyticsSection } from "./AnalyticsSection";

describe("AnalyticsSection (Sprint 3 -- does not hang, F-012)", () => {
  it("renders its content immediately, with no unresolved loading gate blocking the page", () => {
    render(<AnalyticsSection />);

    expect(screen.getByText("Analytics & Reports")).toBeInTheDocument();
    expect(screen.queryByText(/^Loading/)).not.toBeInTheDocument();
  });

  it("shows the honest not-yet-connected empty state outside Demo Mode, not a spinner", () => {
    render(<AnalyticsSection />);

    expect(screen.getByText(/Analytics require OKR, budget/i)).toBeInTheDocument();
  });
});
