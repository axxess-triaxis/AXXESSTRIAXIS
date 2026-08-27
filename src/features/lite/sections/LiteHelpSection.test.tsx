import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LiteHelpSection } from "./LiteHelpSection";

// Lite Settings real-modules pass (2026-08-27): proves Lite's Help & Support tab links to the same
// three real external surveys as X0's BetaFeedbackModal, not a resurrected inline feedback form.
describe("LiteHelpSection", () => {
  it("links to all three real external surveys", () => {
    render(<LiteHelpSection />);
    expect(screen.getByRole("link", { name: /product survey/i })).toHaveAttribute("href", "https://ap.surveymars.com/q/dWD9AHFnT");
    expect(screen.getByRole("link", { name: /enterprise survey/i })).toHaveAttribute("href", "https://ap.surveymars.com/q/NAgaQ43fM");
    expect(screen.getByRole("link", { name: /technical surveyors/i })).toHaveAttribute("href", "https://ap.surveymars.com/q/NnfK3fMgo");
  });
});
