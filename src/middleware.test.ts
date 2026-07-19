import { describe, expect, it } from "vitest";
import {
  getBetaRootRedirectUrl,
  getCanonicalHostRedirectUrl,
  getMarketingWorkspaceRedirectUrl,
  isProtectedRoutePath,
} from "./middleware";

describe("route middleware helpers", () => {
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
});
