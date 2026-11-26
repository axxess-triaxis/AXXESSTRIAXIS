import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { githubStatsAsOf } from "@/components/marketing/siteFacts";
import HomePage from "./page";

// Attempt 4 (2026-07-24): the public home page previously funneled both "Open Beta Workspace" and
// "Sign In" to the same beta.triaxisventures.com/dashboard-or-/auth path, which is exactly what let
// a stale demo/investor session hijack real beta sign-in attempts. These two actions must now point
// at two distinct, purpose-built routes. (2026-11-20: button labels rewritten in plain language.)
describe("HomePage", () => {
  it("links sign-in to the Product subdomain and the demo to the Demo subdomain, not the same shared auth path", () => {
    render(<HomePage />);

    expect(screen.getByRole("link", { name: /^sign in to axxess$/i })).toHaveAttribute("href", "https://landing.triaxisventures.com");
    expect(screen.getByRole("link", { name: /try the demo \(no sign-in\)/i })).toHaveAttribute("href", "https://investor.triaxisventures.com");
    expect(screen.getByRole("link", { name: /^axxess lite$/i })).toHaveAttribute("href", "https://lite.triaxisventures.com");
  });

  it("presents the Triaxis Ventures home page with the vision, sub-page links, base, ownership, and both logos", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: /trying to automate every organization in the world. we are truly horizontal/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/coming to india, uae and eu/i)).toBeInTheDocument();
    expect(screen.getByText(/triaxis ventures private limited, owned and run by its two co-founders/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /axxess triaxis/i })[0]).toHaveAttribute("href", "/axxess-triaxis");
    expect(screen.getAllByRole("link", { name: /founders/i })[0]).toHaveAttribute("href", "/founders");
    expect(screen.getAllByRole("link", { name: /pricing & plans/i })[0]).toHaveAttribute("href", "/pricing-plans");
    expect(screen.getAllByRole("link", { name: /who we build for/i })[0]).toHaveAttribute("href", "/who-we-build-for");
    expect(screen.getAllByRole("link", { name: /how it works/i })[0]).toHaveAttribute("href", "/why-axxess-is-disruptive");
    expect(screen.getAllByRole("link", { name: /where we sell/i })[0]).toHaveAttribute("href", "/global-south");
    expect(screen.getByRole("img", { name: /triaxis ventures logo/i })).toHaveAttribute("src", "/branding/triaxis-ventures-logo.png");
    expect(screen.getByRole("img", { name: /axxess triaxis logo/i })).toHaveAttribute("src", "/branding/axxess-logo.png");
  });

  it("sells The AXXESS Bundle and links the GitHub profile with dated stats", () => {
    render(<HomePage />);

    const bundle = screen.getByRole("region", { name: /the axxess bundle/i });
    for (const product of ["AXXESS TRIaxis", "Callismatic", "Omnidamus", "STILL"]) {
      expect(bundle).toHaveTextContent(product);
    }
    const github = screen.getByRole("region", { name: /built in public on github/i });
    expect(githubStatsAsOf).toMatch(/^\d{1,2} [A-Z][a-z]+ \d{4}$/);
    expect(github).toHaveTextContent(`From the GitHub API on ${githubStatsAsOf}`);
    expect(screen.getByRole("link", { name: /see everything on github/i })).toHaveAttribute("href", "https://github.com/axxess-triaxis");
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
