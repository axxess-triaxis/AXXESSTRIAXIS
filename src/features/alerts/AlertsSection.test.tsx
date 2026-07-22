import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AlertsSection } from "./AlertsSection";

describe("AlertsSection (Sprint 5 -- formal Social Alerts audit, closing the Sprint 3/4 informal-only gap)", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("renders its content immediately, with no unresolved loading gate blocking the page (confirms it cannot reproduce the original hang: no fetch, no async gate)", () => {
    render(<AlertsSection />);

    expect(screen.getByText("Social Alerts")).toBeInTheDocument();
    expect(screen.queryByText(/^Loading/)).not.toBeInTheDocument();
  });

  it("shows an honest empty state outside Demo Mode instead of fabricated demo alerts", () => {
    render(<AlertsSection />);

    expect(screen.getByText(/isn't wired to a live provider or tenant-scoped repository yet/i)).toBeInTheDocument();
    expect(screen.queryByText("State budget note references district oxygen resilience grants")).not.toBeInTheDocument();
    expect(screen.queryByText(/active$/)).not.toBeInTheDocument();
  });

  it("shows the seeded demo alerts and a count badge derived from the actual list length once Demo Mode is enabled", () => {
    window.localStorage.setItem("axxess.demoMode.enabled", "true");
    render(<AlertsSection />);

    expect(screen.getByText("State budget note references district oxygen resilience grants")).toBeInTheDocument();
    expect(screen.getByText("4 active")).toBeInTheDocument();
  });
});
