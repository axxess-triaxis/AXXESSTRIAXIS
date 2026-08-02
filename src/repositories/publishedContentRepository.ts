// MC-2 (2026-08-02): tenant-scoped repository for published content items (Facebook Page/
// Instagram/Threads posts, later X/LinkedIn) -- see
// supabase/migrations/20260802120000_meta_threads_whatsapp_events.sql. Same service-role
// supabaseAdminRest pattern as financialWatchRepository.ts. Ingestion writes (MC-4) come via
// upsertPublishedContentItem; this file has no fabricated data path.
import type { EntityId, ISODateTime, PublishedContentItem, PublishedContentStatus, PublishedContentType, SocialPlatformProviderId, SocialPlatformSurface } from "../domain";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "./supabaseAdmin";
import type { TenantScope } from "./interfaces";

type PublishedContentItemRow = {
  id: string;
  organization_id: string;
  provider_id: SocialPlatformProviderId;
  connection_id: string | null;
  platform_surface: SocialPlatformSurface;
  external_post_id: string | null;
  content_type: PublishedContentType;
  caption: string | null;
  media_urls: string[];
  status: PublishedContentStatus;
  scheduled_at: string | null;
  published_at: string | null;
  permalink: string | null;
  like_count: number;
  comment_count: number;
  share_count: number;
  impression_count: number;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

const SELECT_COLUMNS = "id,organization_id,provider_id,connection_id,platform_surface,external_post_id,content_type,caption,media_urls,status,scheduled_at,published_at,permalink,like_count,comment_count,share_count,impression_count,metadata,created_by,created_at,updated_at";

function fromRow(row: PublishedContentItemRow): PublishedContentItem {
  return {
    id: row.id,
    organizationId: row.organization_id,
    providerId: row.provider_id,
    connectionId: row.connection_id ?? undefined,
    platformSurface: row.platform_surface,
    externalPostId: row.external_post_id ?? undefined,
    contentType: row.content_type,
    caption: row.caption ?? undefined,
    mediaUrls: row.media_urls,
    status: row.status,
    scheduledAt: row.scheduled_at ?? undefined,
    publishedAt: row.published_at ?? undefined,
    permalink: row.permalink ?? undefined,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    shareCount: row.share_count,
    impressionCount: row.impression_count,
    metadata: row.metadata,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listPublishedContentItems(scope: TenantScope, providerId?: SocialPlatformProviderId, limit = 100): Promise<PublishedContentItem[]> {
  if (!isSupabaseAdminConfigured()) return [];
  const params: Record<string, string> = {
    organization_id: `eq.${scope.organizationId}`,
    select: SELECT_COLUMNS,
    order: "published_at.desc.nullslast,created_at.desc",
    limit: String(limit),
  };
  if (providerId) params.provider_id = `eq.${providerId}`;
  const rows = await supabaseAdminRest<PublishedContentItemRow[]>("published_content_items", { query: new URLSearchParams(params) }).catch(() => []);
  return rows.map(fromRow);
}

export type UpsertPublishedContentItemInput = {
  organizationId: EntityId;
  providerId: SocialPlatformProviderId;
  connectionId?: EntityId;
  platformSurface: SocialPlatformSurface;
  externalPostId: string;
  contentType: PublishedContentType;
  caption?: string;
  mediaUrls?: string[];
  status?: PublishedContentStatus;
  scheduledAt?: ISODateTime;
  publishedAt?: ISODateTime;
  permalink?: string;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  impressionCount?: number;
  metadata?: Record<string, unknown>;
};

// Idempotent upsert keyed on the (organization_id, provider_id, external_post_id) unique index --
// safe for a sync job (MC-4) to call repeatedly for the same post without duplicating rows.
export async function upsertPublishedContentItem(input: UpsertPublishedContentItemInput): Promise<PublishedContentItem | undefined> {
  if (!isSupabaseAdminConfigured()) return undefined;
  const rows = await supabaseAdminRest<PublishedContentItemRow[]>("published_content_items", {
    method: "POST",
    query: new URLSearchParams({ on_conflict: "organization_id,provider_id,external_post_id", select: SELECT_COLUMNS }),
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      organization_id: input.organizationId,
      provider_id: input.providerId,
      connection_id: input.connectionId ?? null,
      platform_surface: input.platformSurface,
      external_post_id: input.externalPostId,
      content_type: input.contentType,
      caption: input.caption ?? null,
      media_urls: input.mediaUrls ?? [],
      status: input.status ?? "published",
      scheduled_at: input.scheduledAt ?? null,
      published_at: input.publishedAt ?? null,
      permalink: input.permalink ?? null,
      like_count: input.likeCount ?? 0,
      comment_count: input.commentCount ?? 0,
      share_count: input.shareCount ?? 0,
      impression_count: input.impressionCount ?? 0,
      metadata: input.metadata ?? {},
      updated_at: new Date().toISOString(),
    },
  }).catch(() => undefined);
  return rows?.[0] ? fromRow(rows[0]) : undefined;
}
