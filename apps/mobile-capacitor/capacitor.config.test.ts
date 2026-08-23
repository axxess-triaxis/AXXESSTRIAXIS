import { afterEach, describe, expect, it, vi } from "vitest";

// MN-4 (2026-08-23): "app config validation catches wrong app ID/server URL/host" -- capacitor.
// config.ts computes appId/server URL/allowed hosts from env vars at import time (with hardcoded
// safe defaults), so this loads it fresh under different env states to prove both the honest
// default values Beta 0.9 actually ships with, and that a real environment override genuinely
// changes what the native app points at (the mechanism scripts/validate-mobile-env.mjs's own
// presence check relies on staying correct).
async function loadConfig() {
  vi.resetModules();
  const mod = await import("./capacitor.config");
  return mod.default;
}

describe("capacitor.config.ts (MN-4)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to the real production app ID, app URL, and allowed hosts when no env override is set", async () => {
    vi.stubEnv("CAPACITOR_SERVER_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("CAPACITOR_ALLOWED_HOSTS", "");
    vi.stubEnv("CAPACITOR_APP_ID", "");
    vi.stubEnv("ANDROID_APPLICATION_ID", "");
    vi.stubEnv("IOS_BUNDLE_IDENTIFIER", "");

    const config = await loadConfig();

    expect(config.appId).toBe("com.triaxis.axxess");
    expect(config.server.url).toBe("https://app.axxess.dev");
    expect(config.server.allowNavigation).toContain("app.axxess.dev");
    expect(config.server.cleartext).toBe(false);
  });

  it("respects a real CAPACITOR_SERVER_URL/CAPACITOR_ALLOWED_HOSTS override, proving the config is not silently pinned to production", async () => {
    vi.stubEnv("CAPACITOR_SERVER_URL", "https://staging.axxess.dev");
    vi.stubEnv("CAPACITOR_ALLOWED_HOSTS", "staging.axxess.dev,localhost");
    vi.stubEnv("CAPACITOR_APP_ID", "com.triaxis.axxess.staging");

    const config = await loadConfig();

    expect(config.server.url).toBe("https://staging.axxess.dev");
    expect(config.server.allowNavigation).toEqual(["staging.axxess.dev", "localhost"]);
    expect(config.appId).toBe("com.triaxis.axxess.staging");
  });

  it("never enables cleartext traffic, regardless of env overrides -- a hardcoded security floor, not env-configurable", async () => {
    vi.stubEnv("CAPACITOR_SERVER_URL", "http://insecure.example.com");
    const config = await loadConfig();
    expect(config.server.cleartext).toBe(false);
  });
});
