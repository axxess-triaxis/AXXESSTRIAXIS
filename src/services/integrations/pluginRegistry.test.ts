import { describe, expect, it } from "vitest";
import { getIntegrationHealth, getInfrastructureOnlyIntegrations, getPilotIntegrations, getProductivityPluginRegistry } from "./pluginRegistry";

describe("productivity plugin registry", () => {
  it("lists enterprise productivity adapters without requiring credentials", () => {
    const plugins = getProductivityPluginRegistry({} as unknown as NodeJS.ProcessEnv);
    expect(plugins.length).toBeGreaterThanOrEqual(21);
    // Calendly's OAuth grants access to the whole scheduling account rather than discrete
    // scopes, so it's the one deliberate exception to "every connector requests scopes."
    expect(plugins.filter((plugin) => plugin.requiredScopes.length === 0).map((plugin) => plugin.id)).toEqual(["calendly"]);
  });

  it("marks configured plugins from environment only", () => {
    const health = getIntegrationHealth({ GOOGLE_CLIENT_ID: "configured" } as unknown as NodeJS.ProcessEnv);
    expect(health.configured).toBeGreaterThanOrEqual(4);
    expect(health.webhookReady).toBeGreaterThan(0);
  });

  it("only marks connectors with a real, product-facing connect flow as pilot-enabled", () => {
    // Per PRE_DEMO_ACTIONABLES.md A15/A13/A14: don't present the full catalogue as if every
    // entry were equally available. Gmail/Outlook were already real; Slack/Calendly joined once
    // their own connector contracts + OAuth routes shipped (connectorContract.ts). Everything
    // else remains infrastructure-only until its own product-facing surface ships.
    const pilotIntegrations = getPilotIntegrations({} as unknown as NodeJS.ProcessEnv);
    expect(pilotIntegrations.map((plugin) => plugin.id).sort()).toEqual(["calendly", "gmail", "outlook", "slack"]);
  });

  it("keeps every non-pilot connector out of the pilot list, not silently dropped", () => {
    const health = getIntegrationHealth({} as unknown as NodeJS.ProcessEnv);
    const infrastructureOnly = getInfrastructureOnlyIntegrations({} as unknown as NodeJS.ProcessEnv);
    expect(health.pilotEnabled).toBe(4);
    expect(infrastructureOnly.length).toBe(health.total - 4);
  });
});
