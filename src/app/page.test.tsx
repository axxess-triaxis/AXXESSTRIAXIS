import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

// Attempt 4 (2026-07-24): the public home page previously funneled both "Open Beta Workspace" and
// "Sign In" to the same beta.triaxisventures.com/dashboard-or-/auth path, which is exactly what let
// a stale demo/investor session hijack real beta sign-in attempts. These two actions must now point
// at two distinct, purpose-built routes.
describe("HomePage", () => {
  it("links 'Welcome Aboard' to the Product subdomain and 'Experience AXXESS' to the Demo subdomain, not the same shared auth path", () => {
    render(<HomePage />);

    expect(screen.getByRole("link", { name: /welcome aboard/i })).toHaveAttribute("href", "https://landing.triaxisventures.com");
    expect(screen.getByRole("link", { name: /experience axxess/i })).toHaveAttribute("href", "https://investor.triaxisventures.com");
    expect(screen.getByRole("link", { name: /^stay lite \(for now\)$/i })).toHaveAttribute("href", "https://lite.triaxisventures.com");
  });

  it("presents the Triaxis Ventures home page with sub-page links, base, ownership, and both logos", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: /triaxis ventures builds governed ai products for work/i })).toBeInTheDocument();
    expect(screen.getAllByText(/triaxis ventures private limited/i).length).toBeGreaterThan(1);
    expect(screen.getByText(/india, building for india, the gcc, and the global south/i)).toBeInTheDocument();
    expect(screen.getByText(/ownership/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /axxess triaxis/i })[0]).toHaveAttribute("href", "/axxess-triaxis");
    expect(screen.getAllByRole("link", { name: /founders/i })[0]).toHaveAttribute("href", "/founders");
    expect(screen.getAllByRole("link", { name: /pricing & plans/i })[0]).toHaveAttribute("href", "/pricing-plans");
    expect(screen.getAllByRole("link", { name: /who we build for/i })[0]).toHaveAttribute("href", "/who-we-build-for");
    expect(screen.getAllByRole("link", { name: /why it disrupts/i })[0]).toHaveAttribute("href", "/why-axxess-is-disruptive");
    expect(screen.getAllByRole("link", { name: /global south/i })[0]).toHaveAttribute("href", "/global-south");
    expect(screen.getByRole("img", { name: /triaxis ventures logo/i })).toHaveAttribute("src", "/branding/triaxis-ventures-logo.png");
    expect(screen.getByRole("img", { name: /axxess triaxis logo/i })).toHaveAttribute("src", "/branding/axxess-logo.png");
  });

  it("embeds the looping product demo and single-window promo showreel", () => {
    render(<HomePage />);

    expect(screen.getByLabelText(/axxess triaxis product demo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/axxess looping promo showreel/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /play triaxis ventures promo 1/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /play triaxis ventures promo 2/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /play axxess triaxis promo/i })).toBeInTheDocument();
  });
});
