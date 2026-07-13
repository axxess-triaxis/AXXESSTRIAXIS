import { describe, expect, it } from "vitest";
import { getCanonicalHostRedirectUrl, isProtectedRoutePath } from "./middleware";

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
});
