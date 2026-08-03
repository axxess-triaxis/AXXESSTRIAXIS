// MC-2 (2026-08-02): tenant-scoped repository for community engagement items (comments/DMs/
// mentions needing reply) -- see
// supabase/migrations/20260802120000_meta_threads_whatsapp_events.sql. Same service-role
// supabaseAdminRest pattern as financialWatchRepository.ts. Ingestion writes (MC-4) come via
// upsertCommunityEngagementItem; markReplied/markDismissed are the only authenticated-user actions.
import type { CommunityEngagementItem, CommunityEngagementStatus, CommunityEngagementType, EntityId, ISODateTime, SocialPlatformProviderId, SocialPlatformSurface } from "../domain";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "./supabaseAdmin";
import type { TenantScope } from "./interfaces";

type CommunityEngagementItemRow = {
  id: string;
  organization_id: string;
  provider_id: SocialPlatformProviderId;
  connection_id: string | null;
  platform_surface: SocialPlatformSurface;
  engagement_type: CommunityEngagementType;
  external_engagement_id: string | null;
  related_content_id: string | null;
  author_handle: string | null;
  author_display_name: string | null;
  body_text: string | null;
  sentiment: "positive" | "neutral" | "negative";
  status: CommunityEngagementStatus;
  received_at: string;
  replied_at: string | null;
  replied_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

const SELECT_COLUMNS = "id,organization_id,provider_id,connection_id,platform_surface,engagement_type,external_engagement_id,related_content_id,author_handle,author_display_name,body_text,sentiment,status,received_at,replied_at,replied_by,metadata,created_at";

function fromRow(row: CommunityEngagementItemRow): CommunityEngagementItem {
  return {
    id: row.id,
    organizationId: row.organization_id,
    providerId: row.provider_id,
    connectionId: row.connection_id ?? undefined,
    platformSurface: row.platform_surface,
    engagementType: row.engagement_type,
    externalEngagementId: row.external_engagement_id ?? undefined,
    relatedContentId: row.related_content_id ?? undefined,
    authorHandle: row.author_handle ?? undefined,
    authorDisplayName: row.author_display_name ?? undefined,
    bodyText: row.body_text ?? undefined,
    sentiment: row.sentiment,
    status: row.status,
    receivedAt: row.received_at,
    repliedAt: row.replied_at ?? undefined,
    repliedBy: row.replied_by ?? undefined,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

export async function listCommunityEngagementItems(scope: TenantScope, status: CommunityEngagementStatus = "open", limit = 100): Promise<CommunityEngagementItem[]> {
  if (!isSupabaseAdminConfigured()) return [];
  const query = new URLSearchParams({
    organization_id: `eq.${scope.organizationId}`,
    status: `eq.${status}`,
    select: SELECT_COLUMNS,
    order: "received_at.desc",
    limit: String(limit),
  });
  const rows = await supabaseAdminRest<CommunityEngagementItemRow[]>("community_engagement_items", { query }).catch(() => []);
  return rows.map(fromRow);
}

export type UpsertCommunityEngagementItemInput = {
  organizationId: EntityId;
  providerId: SocialPlatformProviderId;
  connectionId?: EntityId;
  platformSurface: SocialPlatformSurface;
  engagementType: CommunityEngagementType;
  externalEngagementId: string;
  relatedContentId?: EntityId;
  authorHandle?: string;
  authorDisplayName?: string;
  bodyText?: string;
  sentiment?: "positive" | "neutral" | "negative";
  receivedAt?: ISODateTime;
  metadata?: Record<string, unknown>;
};

// Idempotent upsert keyed on (organization_id, provider_id, external_engagement_id) -- safe for
// the sync job (MC-4) to call repeatedly without duplicating open items.
export async function upsertCommunityEngagementItem(input: UpsertCommunityEngagementItemInput): Promise<CommunityEngagementItem | undefined> {
  if (!isSupabaseAdminConfigured()) return undefined;
  const rows = await supabaseAdminRest<CommunityEngagementItemRow[]>("community_engagement_items", {
    method: "POST",
    query: new URLSearchParams({ on_conflict: "organization_id,provider_id,external_engagement_id", select: SELECT_COLUMNS }),
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      organization_id: input.organizationId,
      provider_id: input.providerId,
      connection_id: input.connectionId ?? null,
      platform_surface: input.platformSurface,
      engagement_type: input.engagementType,
      external_engagement_id: input.externalEngagementId,
      related_content_id: input.relatedContentId ?? null,
      author_handle: input.authorHandle ?? null,
      author_display_name: input.authorDisplayName ?? null,
      body_text: input.bodyText ?? null,
      sentiment: input.sentiment ?? "neutral",
      received_at: input.receivedAt ?? new Date().toISOString(),
    },
  }).catch(() => undefined);
  return rows?.[0] ? fromRow(rows[0]) : undefined;
}

async function updateStatus(scope: TenantScope, itemId: EntityId, status: CommunityEngagementStatus, repliedBy?: EntityId): Promise<CommunityEngagementItem | undefined> {
  if (!isSupabaseAdminConfigured()) return undefined;
  const query = new URLSearchParams({
    id: `eq.${itemId}`,
    organization_id: `eq.${scope.organizationId}`,
    select: SELECT_COLUMNS,
  });
  const body: Record<string, unknown> = { status };
  if (status === "replied") {
    body.replied_at = new Date().toISOString();
    body.replied_by = repliedBy ?? scope.userId;
  }
  const rows = await supabaseAdminRest<CommunityEngagementItemRow[]>("community_engagement_items", { method: "PATCH", query, body }).catch(() => []);
  return rows?.[0] ? fromRow(rows[0]) : undefined;
}

export async function markCommunityEngagementReplied(scope: TenantScope, itemId: EntityId): Promise<CommunityEngagementItem | undefined> {
  return updateStatus(scope, itemId, "replied");
}

export async function markCommunityEngagementDismissed(scope: TenantScope, itemId: EntityId): Promise<CommunityEngagementItem | undefined> {
  return updateStatus(scope, itemId, "dismissed");
}
