// MC-2 (2026-08-02): tenant-scoped repository for Ads Manager campaigns/promotions -- see
// supabase/migrations/20260802120000_meta_threads_whatsapp_events.sql. Same service-role
// supabaseAdminRest pattern as financialWatchRepository.ts. Ingestion writes (MC-4) come via
// upsertCampaignPromotion; this file has no fabricated data path.
import type { CampaignPromotion, CampaignStatus, EntityId, ISODateTime, SocialPlatformProviderId } from "../domain";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "./supabaseAdmin";
import type { TenantScope } from "./interfaces";

type CampaignPromotionRow = {
  id: string;
  organization_id: string;
  provider_id: SocialPlatformProviderId;
  connection_id: string | null;
  external_campaign_id: string | null;
  name: string;
  objective: string | null;
  status: CampaignStatus;
  budget_amount: number | null;
  budget_currency: string;
  spend_amount: number;
  start_at: string | null;
  end_at: string | null;
  reach_count: number;
  click_count: number;
  conversion_count: number;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

const SELECT_COLUMNS = "id,organization_id,provider_id,connection_id,external_campaign_id,name,objective,status,budget_amount,budget_currency,spend_amount,start_at,end_at,reach_count,click_count,conversion_count,metadata,created_by,created_at,updated_at";

function fromRow(row: CampaignPromotionRow): CampaignPromotion {
  return {
    id: row.id,
    organizationId: row.organization_id,
    providerId: row.provider_id,
    connectionId: row.connection_id ?? undefined,
    externalCampaignId: row.external_campaign_id ?? undefined,
    name: row.name,
    objective: row.objective ?? undefined,
    status: row.status,
    budgetAmount: row.budget_amount ?? undefined,
    budgetCurrency: row.budget_currency,
    spendAmount: row.spend_amount,
    startAt: row.start_at ?? undefined,
    endAt: row.end_at ?? undefined,
    reachCount: row.reach_count,
    clickCount: row.click_count,
    conversionCount: row.conversion_count,
    metadata: row.metadata,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCampaignsPromotions(scope: TenantScope, limit = 100): Promise<CampaignPromotion[]> {
  if (!isSupabaseAdminConfigured()) return [];
  const query = new URLSearchParams({
    organization_id: `eq.${scope.organizationId}`,
    select: SELECT_COLUMNS,
    order: "created_at.desc",
    limit: String(limit),
  });
  const rows = await supabaseAdminRest<CampaignPromotionRow[]>("campaigns_promotions", { query }).catch(() => []);
  return rows.map(fromRow);
}

export type UpsertCampaignPromotionInput = {
  organizationId: EntityId;
  providerId: SocialPlatformProviderId;
  connectionId?: EntityId;
  externalCampaignId: string;
  name: string;
  objective?: string;
  status?: CampaignStatus;
  budgetAmount?: number;
  budgetCurrency?: string;
  spendAmount?: number;
  startAt?: ISODateTime;
  endAt?: ISODateTime;
  reachCount?: number;
  clickCount?: number;
  conversionCount?: number;
  metadata?: Record<string, unknown>;
};

// Idempotent upsert keyed on (organization_id, provider_id, external_campaign_id) -- safe for the
// sync job (MC-4) to call repeatedly, refreshing spend/reach/click/conversion counts each run.
export async function upsertCampaignPromotion(input: UpsertCampaignPromotionInput): Promise<CampaignPromotion | undefined> {
  if (!isSupabaseAdminConfigured()) return undefined;
  const rows = await supabaseAdminRest<CampaignPromotionRow[]>("campaigns_promotions", {
    method: "POST",
    query: new URLSearchParams({ on_conflict: "organization_id,provider_id,external_campaign_id", select: SELECT_COLUMNS }),
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      organization_id: input.organizationId,
      provider_id: input.providerId,
      connection_id: input.connectionId ?? null,
      external_campaign_id: input.externalCampaignId,
      name: input.name,
      objective: input.objective ?? null,
      status: input.status ?? "active",
      budget_amount: input.budgetAmount ?? null,
      budget_currency: input.budgetCurrency ?? "USD",
      spend_amount: input.spendAmount ?? 0,
      start_at: input.startAt ?? null,
      end_at: input.endAt ?? null,
      reach_count: input.reachCount ?? 0,
      click_count: input.clickCount ?? 0,
      conversion_count: input.conversionCount ?? 0,
      metadata: input.metadata ?? {},
      updated_at: new Date().toISOString(),
    },
  }).catch(() => undefined);
  return rows?.[0] ? fromRow(rows[0]) : undefined;
}
