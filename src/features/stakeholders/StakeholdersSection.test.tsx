import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StakeholdersSection } from "./StakeholdersSection";

describe("StakeholdersSection (Sprint 3 -- does not hang, F-011)", () => {
  it("renders its content immediately, with no unresolved loading gate blocking the page", () => {
    render(<StakeholdersSection />);

    expect(screen.getByText("Stakeholders & CRM")).toBeInTheDocument();
    expect(screen.queryByText(/^Loading/)).not.toBeInTheDocument();
  });

  it("shows the honest not-yet-connected empty state outside Demo Mode, not a spinner", () => {
    render(<StakeholdersSection />);

    expect(screen.getByText(/No stakeholders yet/i)).toBeInTheDocument();
  });
});
