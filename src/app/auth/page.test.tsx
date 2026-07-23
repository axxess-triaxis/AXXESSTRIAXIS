import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AuthPage from "./page";

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

  it("shows a separate, visible Sign up link and Google/Microsoft options alongside manual email/password (Product Issue 1)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ user: null }), { status: 401 })));

    render(<AuthPage />);
    await screen.findByRole("button", { name: /sign in/i });

    expect(screen.getByRole("link", { name: /sign up/i })).toHaveAttribute("href", "/auth/sign-up");
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Microsoft" })).toBeInTheDocument();
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
