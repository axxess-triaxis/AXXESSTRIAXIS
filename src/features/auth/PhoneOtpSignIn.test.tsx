import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PhoneOtpSignIn } from "./PhoneOtpSignIn";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe("PhoneOtpSignIn (Twilio-backed phone OTP sign-in)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    pushMock.mockClear();
  });

  it("always shows the phone entry step, regardless of configuration state", () => {
    render(<PhoneOtpSignIn onError={() => {}} />);
    expect(screen.getByPlaceholderText("+91 XXXXX XXXXX")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send code/i })).toBeInTheDocument();
  });

  it("surfaces the exact safe error from /api/auth/phone/start when phone auth is not enabled, without advancing to the code step", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      error: "Phone sign-in is not enabled for this deployment.",
    }), { status: 400 })));
    const onError = vi.fn();

    render(<PhoneOtpSignIn onError={onError} />);
    fireEvent.change(screen.getByPlaceholderText("+91 XXXXX XXXXX"), { target: { value: "+911234567890" } });
    fireEvent.click(screen.getByRole("button", { name: /Send code/i }));

    await waitFor(() => expect(onError).toHaveBeenCalledWith("Phone sign-in is not enabled for this deployment."));
    expect(screen.queryByRole("button", { name: /Verify/i })).not.toBeInTheDocument();
  });

  it("advances to the code step after a successful send, then verifies and routes on success", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: { id: "user-1", needsOnboarding: false } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<PhoneOtpSignIn onError={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText("+91 XXXXX XXXXX"), { target: { value: "+911234567890" } });
    fireEvent.click(screen.getByRole("button", { name: /Send code/i }));

    await waitFor(() => expect(screen.getByRole("button", { name: /Verify/i })).toBeInTheDocument());
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/auth/phone/start", expect.objectContaining({ method: "POST" }));

    fireEvent.change(screen.getByPlaceholderText("Enter code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /Verify/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ phone: "+911234567890", token: "123456" });
  });

  // A-84 (2026-08-02): a phone number not yet linked to an existing account always reports
  // needsOnboarding:true, even for an existing tenant member -- must never silently auto-route
  // to onboarding, which risks creating a duplicate, tenant-less organization for someone who
  // already has an account.
  describe("needsOnboarding:true (unlinked phone number)", () => {
    async function verifyToConfirmScreen() {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ user: { id: "user-1", needsOnboarding: true } }), { status: 200 }));
      vi.stubGlobal("fetch", fetchMock);

      render(<PhoneOtpSignIn onError={() => {}} />);
      fireEvent.change(screen.getByPlaceholderText("+91 XXXXX XXXXX"), { target: { value: "+911234567890" } });
      fireEvent.click(screen.getByRole("button", { name: /Send code/i }));
      await waitFor(() => expect(screen.getByRole("button", { name: /Verify/i })).toBeInTheDocument());
      fireEvent.change(screen.getByPlaceholderText("Enter code"), { target: { value: "123456" } });
      fireEvent.click(screen.getByRole("button", { name: /Verify/i }));
      await waitFor(() => expect(screen.getByText(/We don't recognize this phone number yet/)).toBeInTheDocument());
    }

    it("shows an explicit interstitial instead of silently auto-routing to onboarding", async () => {
      await verifyToConfirmScreen();
      expect(pushMock).not.toHaveBeenCalled();
    });

    it("only navigates to onboarding on the explicit 'I'm new here, continue' choice", async () => {
      await verifyToConfirmScreen();
      fireEvent.click(screen.getByRole("button", { name: "I'm new here, continue" }));
      expect(pushMock).toHaveBeenCalledWith("/onboarding");
    });

    it("'Sign in a different way' resets to the phone step instead of navigating anywhere, so the existing Google/Microsoft buttons on the same screen remain the escape hatch", async () => {
      await verifyToConfirmScreen();
      fireEvent.click(screen.getByRole("button", { name: "Sign in a different way" }));
      expect(pushMock).not.toHaveBeenCalled();
      expect(screen.getByPlaceholderText("+91 XXXXX XXXXX")).toBeInTheDocument();
    });
  });
});
