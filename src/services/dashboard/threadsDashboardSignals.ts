// Executive Dashboard Redesign Sprint ED-R4: Threads dashboard signal, built on the EXISTING
// published_content_items / community_engagement_items tables (MC-2,
// supabase/migrations/20260802120000_meta_threads_whatsapp_events.sql). Real rows only appear once
// a tenant has run "Sync now" or the daily cron (MC-4) -- a connected-but-never-synced tenant
// honestly reads zero, not a fabricated count. Same connected-check pattern as
// mailDashboardSignals.ts's fetchProviderConnected.
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../repositories/supabaseAdmin";

export type ThreadsDashboardSignals = {
  oauthConnected: boolean;
  recentPostCount: number;
  openReplyCount: number;
};

type IntegrationConnectionRow = { provider_id: string; status: string };
type CountRow = { id: string };

async function fetchProviderConnected(organizationId: string) {
  const query = new URLSearchParams({
    select: "provider_id,status",
    organization_id: `eq.${organizationId}`,
    provider_id: "eq.threads",
    status: "eq.connected",
    limit: "1",
  });
  const rows = await supabaseAdminRest<IntegrationConnectionRow[]>("integration_connections", { query }).catch(() => [] as IntegrationConnectionRow[]);
  return rows.length > 0;
}

async function countPublishedContent(organizationId: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const query = new URLSearchParams({
    select: "id",
    organization_id: `eq.${organizationId}`,
    provider_id: "eq.threads",
    published_at: `gt.${sevenDaysAgo}`,
  });
  const rows = await supabaseAdminRest<CountRow[]>("published_content_items", { query }).catch(() => [] as CountRow[]);
  return rows.length;
}

async function countOpenReplies(organizationId: string) {
  const query = new URLSearchParams({
    select: "id",
    organization_id: `eq.${organizationId}`,
    provider_id: "eq.threads",
    status: "eq.open",
  });
  const rows = await supabaseAdminRest<CountRow[]>("community_engagement_items", { query }).catch(() => [] as CountRow[]);
  return rows.length;
}

export async function getThreadsDashboardSignals(organizationId: string): Promise<ThreadsDashboardSignals> {
  if (!isSupabaseAdminConfigured()) return { oauthConnected: false, recentPostCount: 0, openReplyCount: 0 };

  const [oauthConnected, recentPostCount, openReplyCount] = await Promise.all([
    fetchProviderConnected(organizationId),
    countPublishedContent(organizationId),
    countOpenReplies(organizationId),
  ]);

  return { oauthConnected, recentPostCount, openReplyCount };
}
