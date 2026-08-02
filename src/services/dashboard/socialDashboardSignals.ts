// Executive Dashboard Redesign Sprint ED-R2: social monitoring dashboard signal, built on the
// EXISTING social_alert_rules / social_alert_events tables (see
// supabase/migrations/202607100001_sprint14_rag_integrations_alerts.sql) -- no new migration
// needed. These tables have real schema and RLS, but (confirmed by a repo-wide search) nothing in
// this codebase currently writes rows into them -- no cron job, webhook handler, or manual-entry
// UI exists yet. Querying them is therefore real (a genuine live query against a real table), but
// will read as a genuine, honest zero for every tenant today, not "not connected."
//
// Two SEPARATE, unrelated "social provider" mechanisms exist in this codebase -- this signal uses
// the one that actually gates whether social_alert_events could ever be populated:
//  1. Platform-level env-var credentials (src/services/alerts/socialAlerts.ts's
//     getSocialAlertProviderStatus, reading X_BEARER_TOKEN/META_APP_ID etc.) -- global, not
//     tenant-owned. This is the mechanism used here for "Social provider health."
//  2. Tenant-owned OAuth connectors (connectorContract.ts's "x_twitter" provider +
//     integration_connections table, used by Settings' quick-connect catalogue) -- unrelated to
//     whether social_alert_events ever gets populated; deliberately NOT used for this signal.
//
// "Official-account alerts" (named in the ED-R2 sprint prompt) is intentionally NOT implemented as
// a real query: social_alert_events has no column or metadata convention identifying an "official
// account" alert. Building a heuristic guess here would risk exactly the fabrication this sprint's
// non-negotiables prohibit. Left as an honest not-connected gap, not a real tile -- see closeout.
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../repositories/supabaseAdmin";
import { getSocialAlertProviderStatus } from "../alerts/socialAlerts";

export type SocialDashboardSignals = {
  criticalAlertCount: number;
  queryRan: boolean;
  xConfigured: boolean;
  facebookConfigured: boolean;
};

type SocialAlertEventRow = {
  urgency: string;
  reviewed_at: string | null;
};

export async function getSocialDashboardSignals(organizationId: string): Promise<SocialDashboardSignals> {
  const providers = getSocialAlertProviderStatus();
  const xConfigured = providers.some((provider) => provider.provider === "x" && provider.configured);
  const facebookConfigured = providers.some((provider) => provider.provider === "facebook" && provider.configured);

  if (!isSupabaseAdminConfigured()) {
    return { criticalAlertCount: 0, queryRan: false, xConfigured, facebookConfigured };
  }

  const query = new URLSearchParams({
    select: "urgency,reviewed_at",
    organization_id: `eq.${organizationId}`,
    urgency: "eq.high",
    reviewed_at: "is.null",
  });
  const rows = await supabaseAdminRest<SocialAlertEventRow[]>("social_alert_events", { query }).catch(() => undefined);

  if (rows === undefined) return { criticalAlertCount: 0, queryRan: false, xConfigured, facebookConfigured };
  return { criticalAlertCount: rows.length, queryRan: true, xConfigured, facebookConfigured };
}
