import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EnterpriseOnboardingPage } from "./EnterpriseOnboardingPage";

const authenticatedSessionResponse = () => new Response(JSON.stringify({
  user: { id: "user_1", organizationId: "org_1", role: "Super Admin", email: "founder@triaxisventures.com", displayName: "Founder" },
}), { status: 200 });

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

// Attempt 3 of the live Tenant 0 walkthrough (docs/TENANT_0_ONBOARDING_FINDINGS_2026_07_22.md) found
// that "Continue" advanced past the security-notices screen regardless of how many notices were
// ticked, then blocked provisioning at the very end with one bundled message that didn't say which
// requirement failed -- the user misdiagnosed a missing-notice failure as a department/workspace bug.
describe("EnterpriseOnboardingPage notice enforcement (Sprint 1: Tenant 0 Production Activation)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    pushMock.mockClear();
    window.localStorage.clear();
  });

  it("blocks Continue past the security step until all required notices are accepted, naming what's missing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => authenticatedSessionResponse()));

    render(<EnterpriseOnboardingPage step="security" />);
    await screen.findByRole("heading", { name: /security and beta notices/i });

    fireEvent.click(screen.getByText("Terms of Service"));
    fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));

    expect(await screen.findByText(/accept all required notices to continue/i)).toBeInTheDocument();
    expect(screen.getByText(/accept all required notices to continue/i).textContent).toMatch(/Privacy Policy/);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("allows Continue past the security step once every required notice is accepted", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => authenticatedSessionResponse()));

    render(<EnterpriseOnboardingPage step="security" />);
    await screen.findByRole("heading", { name: /security and beta notices/i });

    for (const checkbox of screen.getAllByRole("checkbox")) {
      fireEvent.click(checkbox);
    }
    fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));

    expect(pushMock).toHaveBeenCalledWith("/onboarding/complete");
  });

  it("names the specific missing requirements on the final step instead of one bundled message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => authenticatedSessionResponse()));

    render(<EnterpriseOnboardingPage step="complete" />);
    await screen.findByText(/onboarding needs attention/i);

    fireEvent.click(screen.getByRole("button", { name: /provision tenant/i }));

    const message = await screen.findByText(/complete the following before provisioning/i);
    expect(message.textContent).toMatch(/organization name or invitation code/);
    expect(message.textContent).toMatch(/sector/);
    expect(message.textContent).toMatch(/role/);
    expect(message.textContent).toMatch(/notices \(Terms of Service, Privacy Policy, AI Usage Notice, Beta Disclaimer\)/);
  });

  // Sprint 1 correction, P0-03 (2026-07-24): a session that expires in the gap between the
  // client-side auth guard rendering and the "Provision tenant" click still reaches the server,
  // which returns a bare 401. Before this fix, that raw "Unauthorized." text flowed straight into
  // the message shown to the user -- exactly the raw-technical-error class of bug this whole
  // program has repeatedly flagged as unacceptable in normal onboarding/auth flows.
  it("never shows the raw server 'Unauthorized' text if the session expires between rendering and clicking Provision tenant", async () => {
    window.localStorage.setItem("axxess-enterprise-onboarding", JSON.stringify({
      organizationName: "Triaxis Ventures Private Limited",
      sector: "Startup",
      role: "Super Admin",
      acceptedNotices: ["Terms of Service", "Privacy Policy", "AI Usage Notice", "Beta Disclaimer"],
    }));
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/onboarding/provision") {
        return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401 });
      }
      return authenticatedSessionResponse();
    }));

    render(<EnterpriseOnboardingPage step="complete" />);
    await screen.findByText(/tenant ready for beta/i);

    fireEvent.click(screen.getByRole("button", { name: /provision tenant/i }));

    const message = await screen.findByText(/session expired/i);
    expect(message.textContent).not.toMatch(/^Unauthorized\.?$/);
    expect(message.textContent?.toLowerCase()).not.toContain("unauthorized");
    expect(message.textContent).toMatch(/sign in again/i);
  });
});
