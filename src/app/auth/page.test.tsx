import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AuthPage from "./page";
import { setDemoModeEnabled } from "../../demo/demoMode";

vi.mock("next/navigation", () => ({
  usePathname: () => "/auth",
  useRouter: () => ({ push: vi.fn() }),
}));

describe("/auth page", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("renders the real login form for a fresh browser with no session (F-001/F-003 regression)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ user: null }), { status: 401 })));

    render(<AuthPage />);

    expect(await screen.findByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open investor preview/i })).toBeInTheDocument();

    expect(screen.queryByText(/^signed in$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/is authenticated/i)).not.toBeInTheDocument();
  });

  it("never shows the Continue-to-workspace bypass for a real Supabase session and silently signs it out (security fix: /auth must only ever land on Sign In)", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/session")) {
        return new Response(JSON.stringify({
          user: { id: "user_1", organizationId: "org_1", role: "Organization Admin", email: "founder@axxess.dev" },
        }), { status: 200 });
      }
      if (url.includes("/api/auth/logout")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ user: null }), { status: 401 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AuthPage />);

    expect(await screen.findByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
    expect(screen.queryByText(/^signed in$/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /continue to workspace/i })).not.toBeInTheDocument();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/logout"),
      expect.objectContaining({ method: "POST" }),
    ));
  });

  // A-87 (2026-08-03): confirmed live via Vercel logs -- POST /api/auth/login 200 immediately
  // followed by POST /api/auth/logout 200 -- a fresh, successful sign-in on this exact page was
  // self-destructing because the auto-logout effect above reactively fired the instant login()
  // updated the session, before router.push had swapped the page away.
  it("does not sign a user back out immediately after they successfully sign in on this same page (A-87 regression)", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/auth/session")) {
        return new Response(JSON.stringify({ user: null }), { status: 401 });
      }
      if (url === "/api/auth/login" && init?.method === "POST") {
        return new Response(JSON.stringify({
          user: { id: "user_1", organizationId: "org_1", role: "Organization Admin", email: "founder@axxess.dev" },
        }), { status: 200 });
      }
      if (url.includes("/api/auth/logout")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AuthPage />);
    await screen.findByRole("button", { name: /^sign in$/i });

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "founder@axxess.dev" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "hunter2" } });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", expect.objectContaining({ method: "POST" })));
    // Give the effect a chance to fire if it were going to -- it must not.
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(fetchMock.mock.calls.some(([reqInput]) => String(reqInput).includes("/api/auth/logout"))).toBe(false);
  });

  it("keeps the Continue-to-workspace bypass for the Investor Preview demo session (documented P0 requirement, unaffected by the real-session fix)", async () => {
    setDemoModeEnabled(true);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ user: null }), { status: 401 })));

    render(<AuthPage />);

    expect(await screen.findByRole("button", { name: /continue to workspace|continue to onboarding/i })).toBeInTheDocument();
    expect(screen.getByText(/is authenticated/i)).toBeInTheDocument();

    setDemoModeEnabled(false);
  });

  it("shows a separate, visible Sign up link and Google/Microsoft options alongside manual email/password (Product Issue 1)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ user: null }), { status: 401 })));

    render(<AuthPage />);
    await screen.findByRole("button", { name: /sign in/i });

    expect(screen.getByRole("link", { name: /sign up/i })).toHaveAttribute("href", "/auth/sign-up");
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Microsoft" })).toBeInTheDocument();
  });

  it("shows a discoverable Forgot password? link pointing at the reset flow (Sprint 1: Tenant 0 Production Activation)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ user: null }), { status: 401 })));

    render(<AuthPage />);
    await screen.findByRole("button", { name: /^sign in$/i });

    expect(screen.getByRole("link", { name: /forgot password/i })).toHaveAttribute("href", "/auth/forgot-password");
  });

  it("shows a Resend confirmation email action when sign-in fails because the email is not confirmed, and lets the user request a new link (Sprint 42)", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/auth/login") {
        return new Response(JSON.stringify({
          error: "Confirm your email before signing in. Check your inbox, or request a new confirmation email.",
          code: "email_not_confirmed",
        }), { status: 401 });
      }
      if (url === "/api/auth/resend-confirmation") {
        return new Response(JSON.stringify({ ok: true, message: "If an account exists for that email, a new confirmation link has been sent." }), { status: 200 });
      }
      return new Response(JSON.stringify({ user: null }), { status: 401 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AuthPage />);
    await screen.findByRole("button", { name: /^sign in$/i });

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "sudipta1213@gmail.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "correct-password-unconfirmed-account" } });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(await screen.findByText(/confirm your email before signing in/i)).toBeInTheDocument();
    const resendButton = await screen.findByRole("button", { name: /resend confirmation email/i });

    fireEvent.click(resendButton);

    expect(await screen.findByText(/a new confirmation link has been sent/i)).toBeInTheDocument();
  });

  it("does not show the resend action for an ordinary wrong-password failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/auth/login") {
        return new Response(JSON.stringify({ error: "Unable to sign in with the supplied email and password." }), { status: 401 });
      }
      return new Response(JSON.stringify({ user: null }), { status: 401 });
    }));

    render(<AuthPage />);
    await screen.findByRole("button", { name: /^sign in$/i });

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "sudipta1213@gmail.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrong-password" } });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(await screen.findByText("Unable to sign in with the supplied email and password.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /resend confirmation email/i })).not.toBeInTheDocument();
  });
});
