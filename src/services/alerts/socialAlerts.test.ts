import { describe, expect, it } from "vitest";
import { getDemoSocialAlerts, getSocialAlertProviderStatus } from "./socialAlerts";

describe("social alert ingestion architecture", () => {
  it("keeps provider credentials gated and demo alerts available", () => {
    const providers = getSocialAlertProviderStatus({} as NodeJS.ProcessEnv);
    expect(providers.find((provider) => provider.provider === "x")?.configured).toBe(false);
    expect(providers.find((provider) => provider.provider === "demo")?.configured).toBe(true);
    expect(getDemoSocialAlerts()).toHaveLength(4);
  });
});
