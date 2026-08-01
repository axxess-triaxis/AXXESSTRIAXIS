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
  });
});
