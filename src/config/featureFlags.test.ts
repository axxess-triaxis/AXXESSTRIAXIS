import { afterEach, describe, expect, it, vi } from "vitest";

async function loadFeatureFlags() {
  vi.resetModules();
  return (await import("./featureFlags")).featureFlags;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("feature flags", () => {
  it("requires real Supabase-backed auth by default", async () => {
    vi.stubEnv("NEXT_PUBLIC_AXXESS_AUTH_SHELL", undefined);

    await expect(loadFeatureFlags()).resolves.toMatchObject({ enableAuthShell: true });
  });

  it("allows local mock auth only when explicitly disabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_AXXESS_AUTH_SHELL", "false");

    await expect(loadFeatureFlags()).resolves.toMatchObject({ enableAuthShell: false });
  });
});
