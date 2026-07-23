import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EnterpriseOnboardingPage } from "./EnterpriseOnboardingPage";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/onboarding",
  useRouter: () => ({ push: pushMock }),
}));

// Product Issue 2 (docs/TENANT_0_ONBOARDING_FINDINGS_2026_07_22.md): the wizard previously let a
// completely unauthenticated visitor fill out all 5 data-entry screens before failing only at the
// final "Provision tenant" click with a bare "Unauthorized". src/proxy.ts now edge-protects
// /onboarding; this suite covers the client-side defense-in-depth guard added alongside it, for
// the case where a session expires mid-wizard (wizard state survives in localStorage across page
// loads, so this is a real scenario the edge check alone can't catch).
describe("EnterpriseOnboardingPage auth guard (Product Issue 2 remediation, Sprint 42)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    pushMock.mockClear();
    window.localStorage.clear();
  });

  it("shows a checking-session loading state before the session resolves", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

    render(<EnterpriseOnboardingPage step="start" />);

    expect(screen.getByText(/checking session/i)).toBeInTheDocument();
  });

  it("shows a sign-in-required guard instead of the wizard when there is no session", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ user: null }), { status: 401 })));

    render(<EnterpriseOnboardingPage step="start" />);

    expect(await screen.findByText(/sign in required/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/auth?next=/onboarding");
    expect(screen.queryByText(/how should this user enter axxess/i)).not.toBeInTheDocument();
  });

  it("renders the wizard once a real, authenticated session is present", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      user: { id: "user_1", organizationId: "org_1", role: "Super Admin", email: "founder@triaxisventures.com", displayName: "Founder" },
    }), { status: 200 })));

    render(<EnterpriseOnboardingPage step="start" />);

    expect(await screen.findByText(/how should this user enter axxess/i)).toBeInTheDocument();
    expect(screen.queryByText(/sign in required/i)).not.toBeInTheDocument();
  });
});
