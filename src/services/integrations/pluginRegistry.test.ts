import { describe, expect, it } from "vitest";
import { getIntegrationHealth, getInfrastructureOnlyIntegrations, getPilotIntegrations, getProductivityPluginRegistry } from "./pluginRegistry";

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

  it("only marks connectors with a real, product-facing connect flow as pilot-enabled", () => {
    // Per PRE_DEMO_ACTIONABLES.md A15: don't present the full catalogue as if every entry were
    // equally available. Only Gmail/Outlook have real connector code today (connectorContract.ts);
    // everything else is infrastructure-only until its own product-facing surface ships.
    const pilotIntegrations = getPilotIntegrations({} as unknown as NodeJS.ProcessEnv);
    expect(pilotIntegrations.map((plugin) => plugin.id).sort()).toEqual(["gmail", "outlook"]);
  });

  it("keeps every non-pilot connector out of the pilot list, not silently dropped", () => {
    const health = getIntegrationHealth({} as unknown as NodeJS.ProcessEnv);
    const infrastructureOnly = getInfrastructureOnlyIntegrations({} as unknown as NodeJS.ProcessEnv);
    expect(health.pilotEnabled).toBe(2);
    expect(infrastructureOnly.length).toBe(health.total - 2);
  });
});
