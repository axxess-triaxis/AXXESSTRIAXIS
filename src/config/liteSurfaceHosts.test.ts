import { afterEach, describe, expect, it, vi } from "vitest";
import {
  defaultLiteHosts,
  getAxxessSurfaceFromEnv,
  getLiteHosts,
  isLiteHost,
  normalizeHost,
  resolveIsLiteSurface,
} from "./liteSurfaceHosts";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("liteSurfaceHosts (XL-4, 2026-08-05): single source of truth for host list shared between src/proxy.ts and src/demo/demoMode.ts", () => {
  it("includes both the real custom domain and the *.vercel.app fallback by default", () => {
    expect(defaultLiteHosts).toContain("lite.triaxisventures.com");
    expect(defaultLiteHosts).toContain("triaxis-product-lite-web.vercel.app");
  });

  it("normalizes hosts by stripping port and lowercasing", () => {
    expect(normalizeHost("Lite.Triaxisventures.com:443")).toBe("lite.triaxisventures.com");
    expect(normalizeHost(null)).toBeNull();
    expect(normalizeHost(undefined)).toBeNull();
  });

  it("getLiteHosts falls back to defaults when AXXESS_LITE_HOSTS is unset", () => {
    expect(getLiteHosts(undefined)).toEqual(defaultLiteHosts);
  });

  it("getLiteHosts honors an explicit override", () => {
    expect(getLiteHosts("custom-lite.example.com, other-lite.example.com")).toEqual([
      "custom-lite.example.com",
      "other-lite.example.com",
    ]);
  });

  it("isLiteHost matches known Lite hosts and rejects X0 hosts", () => {
    expect(isLiteHost("lite.triaxisventures.com", undefined)).toBe(true);
    expect(isLiteHost("triaxis-product-lite-web.vercel.app", undefined)).toBe(true);
    expect(isLiteHost("landing.triaxisventures.com", undefined)).toBe(false);
    expect(isLiteHost(null, undefined)).toBe(false);
  });

  it("getAxxessSurfaceFromEnv parses the three valid values and rejects anything else", () => {
    expect(getAxxessSurfaceFromEnv("lite")).toBe("lite");
    expect(getAxxessSurfaceFromEnv("x0")).toBe("x0");
    expect(getAxxessSurfaceFromEnv("demo")).toBe("demo");
    expect(getAxxessSurfaceFromEnv(undefined)).toBeNull();
    expect(getAxxessSurfaceFromEnv("staging")).toBeNull();
  });

  describe("resolveIsLiteSurface", () => {
    it("is true for a known Lite host with no AXXESS_SURFACE set (today's live behavior, zero config required)", () => {
      expect(resolveIsLiteSurface("lite.triaxisventures.com", undefined, undefined)).toBe(true);
    });

    it("is false for an X0 host with no AXXESS_SURFACE set", () => {
      expect(resolveIsLiteSurface("landing.triaxisventures.com", undefined, undefined)).toBe(false);
    });

    it("is true when AXXESS_SURFACE=lite is set, even on a host not in the Lite list -- an explicit deployment declaration overrides host detection", () => {
      expect(resolveIsLiteSurface("some-other-host.example.com", undefined, "lite")).toBe(true);
    });

    it("AXXESS_SURFACE=x0 does not override host-based detection -- only \"lite\" short-circuits; host detection still applies otherwise", () => {
      expect(resolveIsLiteSurface("lite.triaxisventures.com", undefined, "x0")).toBe(true);
      expect(resolveIsLiteSurface("landing.triaxisventures.com", undefined, "x0")).toBe(false);
    });
  });
});
