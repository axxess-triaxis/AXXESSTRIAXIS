import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OAuthProviderButtons } from "./OAuthProviderButtons";

describe("OAuthProviderButtons (separate sign-up entry point, Gmail/Outlook options)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("always shows both Google and Microsoft as visible options, regardless of configuration state", () => {
    render(<OAuthProviderButtons onError={() => {}} />);

    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Microsoft" })).toBeInTheDocument();
  });

  it("redirects the browser to the returned authorizeUrl when a provider is configured", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      provider: "google",
      authorizeUrl: "https://example.supabase.co/auth/v1/authorize?provider=google",
    }), { status: 200 })));
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });

    render(<OAuthProviderButtons onError={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://example.supabase.co/auth/v1/authorize?provider=google"));
  });

  it("surfaces the exact safe error from /api/auth/oauth/start when a provider is not enabled, without redirecting", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      error: "microsoft OAuth is not enabled for this deployment.",
    }), { status: 400 })));
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    const onError = vi.fn();

    render(<OAuthProviderButtons onError={onError} />);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Microsoft" }));

    await waitFor(() => expect(onError).toHaveBeenCalledWith("microsoft OAuth is not enabled for this deployment."));
    expect(assign).not.toHaveBeenCalled();
  });
});
