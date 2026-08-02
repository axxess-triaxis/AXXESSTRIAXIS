// Executive Dashboard Redesign Sprint ED-R4: Meta Business Suite dashboard signal, built on the
// EXISTING published_content_items / campaigns_promotions tables (MC-2). Real rows only appear
// once a tenant has run "Sync now" or the daily cron (MC-4) -- a connected-but-never-synced tenant
// honestly reads zero, not a fabricated count. Same connected-check pattern as
// mailDashboardSignals.ts's fetchProviderConnected.
import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../repositories/supabaseAdmin";

export type MetaBusinessDashboardSignals = {
  oauthConnected: boolean;
  recentPostCount: number;
  activeCampaignCount: number;
  overBudgetCampaignCount: number;
};

type IntegrationConnectionRow = { provider_id: string; status: string };
type ContentCountRow = { id: string };
type CampaignRow = { id: string; budget_amount: number | null; spend_amount: number };

async function fetchProviderConnected(organizationId: string) {
  const query = new URLSearchParams({
    select: "provider_id,status",
    organization_id: `eq.${organizationId}`,
    provider_id: "eq.meta_business",
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
    provider_id: "eq.meta_business",
    published_at: `gt.${sevenDaysAgo}`,
  });
  const rows = await supabaseAdminRest<ContentCountRow[]>("published_content_items", { query }).catch(() => [] as ContentCountRow[]);
  return rows.length;
}

async function fetchActiveCampaigns(organizationId: string) {
  const query = new URLSearchParams({
    select: "id,budget_amount,spend_amount",
    organization_id: `eq.${organizationId}`,
    provider_id: "eq.meta_business",
    status: "eq.active",
  });
  return supabaseAdminRest<CampaignRow[]>("campaigns_promotions", { query }).catch(() => [] as CampaignRow[]);
}

export async function getMetaBusinessDashboardSignals(organizationId: string): Promise<MetaBusinessDashboardSignals> {
  if (!isSupabaseAdminConfigured()) return { oauthConnected: false, recentPostCount: 0, activeCampaignCount: 0, overBudgetCampaignCount: 0 };

  const [oauthConnected, recentPostCount, activeCampaigns] = await Promise.all([
    fetchProviderConnected(organizationId),
    countPublishedContent(organizationId),
    fetchActiveCampaigns(organizationId),
  ]);

  const overBudgetCampaignCount = activeCampaigns.filter((campaign) => campaign.budget_amount !== null && campaign.spend_amount > campaign.budget_amount).length;

  return { oauthConnected, recentPostCount, activeCampaignCount: activeCampaigns.length, overBudgetCampaignCount };
}
