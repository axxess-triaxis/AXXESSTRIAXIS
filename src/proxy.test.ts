import { describe, expect, it } from "vitest";
import {
  getBetaRootRedirectUrl,
  getCanonicalHostRedirectUrl,
  getMarketingWorkspaceRedirectUrl,
  isAuthShellEnabledFromEnv,
  isDemoModeEnabledFromEnv,
  isProtectedRoutePath,
  shouldRedirectToLogin,
} from "./proxy";

describe("route proxy helpers (renamed from middleware.ts in Sprint 5, Next.js 16 middleware-to-proxy migration)", () => {
  it("identifies protected workspace paths", () => {
    expect(isProtectedRoutePath("/dashboard")).toBe(true);
    expect(isProtectedRoutePath("/projects/active")).toBe(true);
    expect(isProtectedRoutePath("/settings")).toBe(true);
    expect(isProtectedRoutePath("/admin/beta-readiness")).toBe(true);
  });

  it("leaves public auth and static paths unprotected", () => {
    expect(isProtectedRoutePath("/auth")).toBe(false);
    expect(isProtectedRoutePath("/")).toBe(false);
  });

  it("redirects apex production host to canonical www host", () => {
    const redirectUrl = getCanonicalHostRedirectUrl(
      new URL("https://triaxisventures.com/dashboard?tab=active"),
      "triaxisventures.com",
    );

    expect(redirectUrl?.toString()).toBe("https://www.triaxisventures.com/dashboard?tab=active");
  });

  it("does not redirect requests already on the canonical host", () => {
    const redirectUrl = getCanonicalHostRedirectUrl(
      new URL("https://www.triaxisventures.com/dashboard"),
      "www.triaxisventures.com",
    );

    expect(redirectUrl).toBeNull();
  });

  it("redirects beta root host to dashboard", () => {
    const redirectUrl = getBetaRootRedirectUrl(
      new URL("https://beta.triaxisventures.com/"),
      "beta.triaxisventures.com",
    );

    expect(redirectUrl?.toString()).toBe("https://beta.triaxisventures.com/dashboard");
  });

  it("does not redirect non-root beta routes", () => {
    const redirectUrl = getBetaRootRedirectUrl(
      new URL("https://beta.triaxisventures.com/auth"),
      "beta.triaxisventures.com",
    );

    expect(redirectUrl).toBeNull();
  });

  it("normalizes hosts with ports before canonical checks", () => {
    const redirectUrl = getCanonicalHostRedirectUrl(
      new URL("https://triaxisventures.com/dashboard"),
      "triaxisventures.com:443",
    );

    expect(redirectUrl?.toString()).toBe("https://www.triaxisventures.com/dashboard");
  });

  it("redirects workspace routes on canonical marketing host to beta host", () => {
    const redirectUrl = getMarketingWorkspaceRedirectUrl(
      new URL("https://www.triaxisventures.com/dashboard?tab=active"),
      "www.triaxisventures.com",
    );

    expect(redirectUrl?.toString()).toBe("https://beta.triaxisventures.com/dashboard?tab=active");
  });

  it("redirects auth routes on canonical marketing host to beta host", () => {
    const redirectUrl = getMarketingWorkspaceRedirectUrl(
      new URL("https://www.triaxisventures.com/auth?next=%2Fdashboard"),
      "www.triaxisventures.com",
    );

    expect(redirectUrl?.toString()).toBe("https://beta.triaxisventures.com/auth?next=%2Fdashboard");
  });

  it("keeps marketing root on canonical host", () => {
    const redirectUrl = getMarketingWorkspaceRedirectUrl(
      new URL("https://www.triaxisventures.com/"),
      "www.triaxisventures.com",
    );

    expect(redirectUrl).toBeNull();
  });

  it("requires real Supabase auth by default, matching featureFlags.enableAuthShell", () => {
    expect(isAuthShellEnabledFromEnv(undefined)).toBe(true);
    expect(isAuthShellEnabledFromEnv("true")).toBe(true);
  });

  it("only disables the auth-shell guard when explicitly set to false", () => {
    expect(isAuthShellEnabledFromEnv("false")).toBe(false);
  });

  it("only enables demo mode when explicitly set to true", () => {
    expect(isDemoModeEnabledFromEnv(undefined)).toBe(false);
    expect(isDemoModeEnabledFromEnv("false")).toBe(false);
    expect(isDemoModeEnabledFromEnv("true")).toBe(true);
  });

  it("redirects a protected route to /auth when no session cookie is present (production-safe default)", () => {
    expect(shouldRedirectToLogin("/dashboard", {
      authShellEnabled: true,
      demoModeEnabled: false,
      hasSessionCookie: false,
    })).toBe(true);
  });

  it("does not redirect once a session cookie is present", () => {
    expect(shouldRedirectToLogin("/dashboard", {
      authShellEnabled: true,
      demoModeEnabled: false,
      hasSessionCookie: true,
    })).toBe(false);
  });

  it("does not redirect when demo mode is explicitly enabled", () => {
    expect(shouldRedirectToLogin("/dashboard", {
      authShellEnabled: true,
      demoModeEnabled: true,
      hasSessionCookie: false,
    })).toBe(false);
  });

  it("does not redirect when the auth shell is explicitly disabled for local mock auth", () => {
    expect(shouldRedirectToLogin("/dashboard", {
      authShellEnabled: false,
      demoModeEnabled: false,
      hasSessionCookie: false,
    })).toBe(false);
  });

  it("never redirects a non-protected route such as /auth itself", () => {
    expect(shouldRedirectToLogin("/auth", {
      authShellEnabled: true,
      demoModeEnabled: false,
      hasSessionCookie: false,
    })).toBe(false);
  });
});
