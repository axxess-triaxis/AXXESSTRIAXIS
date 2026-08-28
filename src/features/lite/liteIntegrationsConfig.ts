import type { ConnectorProviderId } from "../../services/integrations/connectorContract";

// Lite Settings real-modules pass (2026-08-27): the one place Lite's scoped-down connector list is
// defined -- imported by LiteIntegrationsSection.tsx (the UI) and by
// src/app/api/connectors/oauth/start/route.ts + oauth/callback/route.ts (the server-side narrowing
// that stops a Lite host request from reaching an X0-only provider even if it's otherwise fully
// configured, since proxy.ts's edge gate can't cheaply inspect the ?provider= query value).
// Matches docs/readiness/AXXESS_LITE_PRODUCTION_SCOPE_AND_NAVIGATION_CONTRACT_2026_08_05.md
// Section 11's named 15-item list, minus "Google OAuth sign-in" and "OpenAI/OpenRouter for AI
// capability" -- both real items on that list, but neither is a connector-contract entry at all
// (they're auth-provider and AI-model config, a different concern from this page). Deliberately
// NOT derived from src/services/integrations/pluginRegistry.ts -- src/features/lite/
// liteIsolation.test.ts statically forbids importing it from anywhere under src/app/lite or
// src/features/lite, so this list is its own small, hardcoded source of truth.
export const liteConnectorLabels: Record<string, string> = {
  gmail: "Gmail",
  google_calendar: "Google Calendar",
  google_drive: "Google Drive",
  google_sheets: "Google Sheets",
  microsoft: "Microsoft Outlook",
  teams: "Microsoft Teams",
  whatsapp_business: "WhatsApp Business",
  zoom: "Zoom",
  notion: "Notion",
  slack: "Slack",
  hubspot: "HubSpot",
  airtable: "Airtable",
};

export const liteConnectorProviderIds = Object.keys(liteConnectorLabels) as ConnectorProviderId[];

export function isLiteAllowedConnectorProvider(providerId: string): boolean {
  return liteConnectorProviderIds.includes(providerId as ConnectorProviderId);
}
