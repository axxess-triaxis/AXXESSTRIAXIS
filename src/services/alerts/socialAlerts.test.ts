import { describe, expect, it } from "vitest";
import { getDemoSocialAlerts, getSocialAlertProviderStatus } from "./socialAlerts";

describe("social alert ingestion architecture", () => {
  it("keeps provider credentials gated and demo alerts available", () => {
    const providers = getSocialAlertProviderStatus({} as NodeJS.ProcessEnv);
    expect(providers.find((provider) => provider.provider === "x")?.configured).toBe(false);
    expect(providers.find((provider) => provider.provider === "demo")?.configured).toBe(true);
    // Investor Demo enterprise-scale dataset pass (2026-07-24): grown from 4 to 160 seeded
    // alerts so the demo feels like a mature institution's real signal volume.
    expect(getDemoSocialAlerts()).toHaveLength(160);
  });

  it("generates a deterministic queue -- identical output on every call, no randomness", () => {
    expect(getDemoSocialAlerts()).toEqual(getDemoSocialAlerts());
  });
});
