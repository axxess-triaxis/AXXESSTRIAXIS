// Executive Dashboard Redesign Sprint ED-R3: Zoom / Google Meet upcoming-meeting signal.
//
// Investigation finding: both "zoom" and "google_calendar" are registered OAuth connector
// contracts (connectorContract.ts), and a tenant CAN complete OAuth and get a row in
// integration_connections with status='connected' -- but no service code anywhere in this
// codebase actually calls the Zoom API or the Google Calendar API to fetch events (unlike
// gmail/microsoft, which have dedicated gmailSelectedMessage.ts/microsoftGraphMailbox.ts fetch
// services). So even a tenant with a fully connected Zoom/Google Calendar account cannot get a
// real "upcoming meetings" count from this codebase today -- the honest state is "not connected"
// in both senses (data plumbing doesn't exist), with precise language distinguishing "OAuth not
// connected" from "OAuth connected, but no event-fetching service exists yet" rather than
// collapsing both into one vague message.
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../repositories/supabaseAdmin";

export type ExternalMeetingsDashboardSignals = {
  zoomOAuthConnected: boolean;
  googleCalendarOAuthConnected: boolean;
};

type IntegrationConnectionRow = {
  provider_id: string;
  status: string;
};

async function fetchProviderConnected(organizationId: string, providerId: "zoom" | "google_calendar") {
  const query = new URLSearchParams({
    select: "provider_id,status",
    organization_id: `eq.${organizationId}`,
    provider_id: `eq.${providerId}`,
    status: "eq.connected",
    limit: "1",
  });
  const rows = await supabaseAdminRest<IntegrationConnectionRow[]>("integration_connections", { query }).catch(() => [] as IntegrationConnectionRow[]);
  return rows.length > 0;
}

export async function getExternalMeetingsDashboardSignals(organizationId: string): Promise<ExternalMeetingsDashboardSignals> {
  if (!isSupabaseAdminConfigured()) {
    return { zoomOAuthConnected: false, googleCalendarOAuthConnected: false };
  }
  const [zoomOAuthConnected, googleCalendarOAuthConnected] = await Promise.all([
    fetchProviderConnected(organizationId, "zoom"),
    fetchProviderConnected(organizationId, "google_calendar"),
  ]);
  return { zoomOAuthConnected, googleCalendarOAuthConnected };
}
