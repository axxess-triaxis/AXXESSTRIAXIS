import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EnterpriseAuthFlowPage } from "./EnterpriseAuthFlowPage";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/auth/sign-up",
  useRouter: () => ({ push: pushMock }),
}));

describe("EnterpriseAuthFlowPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    pushMock.mockClear();
    window.location.hash = "";
  });

  describe("sign-up (Product Issue 1 remediation)", () => {
    it("offers manual email/password plus Google/Microsoft as separate, visible options, with a link back to sign-in", () => {
      render(<EnterpriseAuthFlowPage kind="sign-up" />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Continue with Microsoft" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/auth");
    });

    it("replaces the form with an unmistakable success panel after a successful sign-up (Sprint 1 correction, 2026-07-24)", async () => {
      vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
        expect(String(input)).toBe("/api/auth/sign-up");
        return new Response(JSON.stringify({ ok: true, message: "Check your email to verify the account before onboarding." }), { status: 200 });
      }));

      render(<EnterpriseAuthFlowPage kind="sign-up" />);
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "new.user@example.com" } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "a-strong-password" } });
      fireEvent.click(screen.getByRole("button", { name: "Create account" }));

      expect(await screen.findByText("Account created")).toBeInTheDocument();
      expect(screen.getAllByText(/new\.user@example\.com/).length).toBeGreaterThan(0);
      expect(screen.getByRole("link", { name: /go to sign in/i })).toHaveAttribute("href", "/auth");

      // The form itself is gone -- a repeat click on "Create account" is no longer possible,
      // directly addressing the correction prompt's "duplicate attempts should be discouraged."
      expect(screen.queryByRole("button", { name: "Create account" })).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    });

    it("shows an error-toned message pointing to sign-in when the account already exists (Sprint 42)", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
        error: "An account already exists for this email. Sign in instead.",
        code: "user_already_exists",
      }), { status: 409 })));

      render(<EnterpriseAuthFlowPage kind="sign-up" />);
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "existing.user@example.com" } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "a-strong-password" } });
      fireEvent.click(screen.getByRole("button", { name: "Create account" }));

      const messageEl = await screen.findByText("An account already exists for this email. Sign in instead.");
      expect(messageEl).toHaveClass("bg-red-50");
    });
  });

  describe("login kind -- OAuth callback session establishment", () => {
    it("does nothing when there is no access_token in the URL fragment (plain navigation to /auth/login)", () => {
      render(<EnterpriseAuthFlowPage kind="login" />);
      expect(screen.queryByText(/completing sign-in/i)).not.toBeInTheDocument();
    });

    it("exchanges an OAuth access_token from the URL fragment for a real session and redirects into the app", async () => {
      window.location.hash = "#access_token=test-access-token&refresh_token=test-refresh-token";
      vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        expect(String(input)).toBe("/api/auth/oauth/callback");
        expect(JSON.parse(String(init?.body))).toEqual({ accessToken: "test-access-token", refreshToken: "test-refresh-token" });
        return new Response(JSON.stringify({ user: { id: "user_1", needsOnboarding: false } }), { status: 200 });
      }));

      render(<EnterpriseAuthFlowPage kind="login" />);

      await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
    });

    it("routes a first-time OAuth user (no organization yet) to onboarding instead of the dashboard", async () => {
      window.location.hash = "#access_token=test-access-token";
      vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ user: { id: "user_1", needsOnboarding: true } }), { status: 200 })));

      render(<EnterpriseAuthFlowPage kind="login" />);

      await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/onboarding"));
    });

    it("shows a clear error and does not redirect when the token exchange fails", async () => {
      window.location.hash = "#access_token=bad-token";
      vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "Unable to complete sign-in with the selected provider." }), { status: 401 })));

      render(<EnterpriseAuthFlowPage kind="login" />);

      expect(await screen.findByText("Unable to complete sign-in with the selected provider.")).toBeInTheDocument();
      expect(pushMock).not.toHaveBeenCalled();
    });
  });
});
