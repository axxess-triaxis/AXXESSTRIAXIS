import { describe, expect, it } from "vitest";
import { getIntegrationHealth, getInfrastructureOnlyIntegrations, getPilotIntegrations, getProductivityPluginRegistry } from "./pluginRegistry";

describe("productivity plugin registry", () => {
  it("lists enterprise productivity adapters without requiring credentials", () => {
    const plugins = getProductivityPluginRegistry({} as unknown as NodeJS.ProcessEnv);
    expect(plugins.length).toBeGreaterThanOrEqual(25);
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
    // their own connector contracts + OAuth routes shipped (connectorContract.ts). Airtable/
    // HubSpot/Notion joined 2026-07-21 once the same OAuth pipeline was extended to them
    // (connectorContract.ts's requiresPkce/tokenRequestStyle branches). Google Calendar/Zoom/
    // Teams joined 2026-07-29 (Sprint SI-1) so each tenant can link their own meeting/scheduling
    // provider rather than a single shared Calendly link. Linear/GitHub/Google Sheets/WhatsApp
    // Business/Google Docs/Google Slides/X (Twitter) joined 2026-07-30 (founder-scoped connector
    // batch). Everything else remains infrastructure-only or credential-storage-only until its own
    // product-facing surface ships.
    const pilotIntegrations = getPilotIntegrations({} as unknown as NodeJS.ProcessEnv);
    expect(pilotIntegrations.map((plugin) => plugin.id).sort()).toEqual(["airtable", "calendly", "github", "gmail", "google_calendar", "google_docs", "google_drive", "google_sheets", "google_slides", "hubspot", "linear", "meta_business", "notion", "outlook", "slack", "teams", "threads", "whatsapp_business", "x_twitter", "zoom"]);
  });

  it("keeps every non-pilot connector out of the pilot list, not silently dropped", () => {
    const health = getIntegrationHealth({} as unknown as NodeJS.ProcessEnv);
    const infrastructureOnly = getInfrastructureOnlyIntegrations({} as unknown as NodeJS.ProcessEnv);
    expect(health.pilotEnabled).toBe(20);
    expect(infrastructureOnly.length).toBe(health.total - 20);
  });
});
