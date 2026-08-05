import { afterEach, describe, expect, it, vi } from "vitest";
import { getLiteSurface, isForbiddenForLiteSurface, isLiteSurface, liteSurfaceId } from "./liteSurface";

const originalLocation = window.location;

// jsdom's history.pushState enforces same-origin, so it can't simulate a request from a different
// hostname (e.g. lite.triaxisventures.com) -- stubbing window.location directly instead, same
// technique as src/demo/demoMode.test.ts.
function stubWindowHostname(hostname: string) {
  Object.defineProperty(window, "location", {
    writable: true,
    configurable: true,
    value: { ...originalLocation, hostname },
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  Object.defineProperty(window, "location", { writable: true, configurable: true, value: originalLocation });
});

describe("AXXESS Lite surface marker (XL-4, 2026-08-06: delegates to src/config/liteSurfaceHosts.ts)", () => {
  it("marks Lite as its own product surface", () => {
    expect(liteSurfaceId).toBe("lite");
    expect(isLiteSurface("lite")).toBe(true);
  });

  it("does not let X0 or Demo activate Lite assumptions", () => {
    expect(isLiteSurface("x0")).toBe(false);
    expect(isLiteSurface("demo")).toBe(false);
    expect(isForbiddenForLiteSurface("x0")).toBe(true);
    expect(isForbiddenForLiteSurface("demo")).toBe(true);
  });

  describe("getLiteSurface", () => {
    it("resolves to lite on a known Lite host", () => {
      stubWindowHostname("lite.triaxisventures.com");
      expect(getLiteSurface()).toBe("lite");
    });

    it("resolves to x0 on a normal host with no AXXESS_SURFACE declared", () => {
      stubWindowHostname("landing.triaxisventures.com");
      expect(getLiteSurface()).toBe("x0");
    });

    it("honors an explicit AXXESS_SURFACE=lite declaration even on a non-Lite host", () => {
      vi.stubEnv("AXXESS_SURFACE", "lite");
      stubWindowHostname("some-other-host.example.com");
      expect(getLiteSurface()).toBe("lite");
    });

    it("honors an explicit AXXESS_SURFACE=demo declaration", () => {
      vi.stubEnv("AXXESS_SURFACE", "demo");
      stubWindowHostname("investor.triaxisventures.com");
      expect(getLiteSurface()).toBe("demo");
    });
  });
});
