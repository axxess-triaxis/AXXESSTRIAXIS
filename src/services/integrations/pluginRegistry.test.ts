import { describe, expect, it } from "vitest";
import { getIntegrationHealth, getProductivityPluginRegistry } from "./pluginRegistry";

describe("productivity plugin registry", () => {
  it("lists enterprise productivity adapters without requiring credentials", () => {
    const plugins = getProductivityPluginRegistry({} as unknown as NodeJS.ProcessEnv);
    expect(plugins.length).toBeGreaterThanOrEqual(20);
    expect(plugins.every((plugin) => plugin.requiredScopes.length > 0)).toBe(true);
  });

  it("marks configured plugins from environment only", () => {
    const health = getIntegrationHealth({ GOOGLE_CLIENT_ID: "configured" } as unknown as NodeJS.ProcessEnv);
    expect(health.configured).toBeGreaterThanOrEqual(4);
    expect(health.webhookReady).toBeGreaterThan(0);
  });
});
