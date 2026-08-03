// MC-4 (2026-08-02): pull-based Threads content ingestion. Same fetch/parse shape as
// microsoftGraphMailbox.ts (injectable fetcher for testability, pure parse function separated from
// the HTTP call). NOTE: exact field names not independently verified against live Threads API docs
// -- same honesty flag as this repo's existing Zoom-scope precedent; confirm before a real tenant
// sync, since Meta's Threads API has changed field names across versions.
import type { PublishedContentType } from "../../domain";
import { upsertPublishedContentItem } from "../../repositories/publishedContentRepository";
import { resolveSocialConnectionToken } from "./socialConnectionToken";

export type ThreadsPost = {
  id: string;
  text?: string;
  media_type?: string;
  media_url?: string;
  permalink?: string;
  timestamp?: string;
};

export type ThreadsListPayload = {
  data?: ThreadsPost[];
  error?: { message?: string };
};

function contentTypeFromMediaType(mediaType: string | undefined): PublishedContentType {
  switch (mediaType) {
    case "IMAGE": return "image";
    case "VIDEO": return "video";
    case "CAROUSEL_ALBUM": return "carousel";
    default: return "text";
  }
}

export async function fetchThreadsPosts(accessToken: string, limit = 25, fetcher: typeof fetch = fetch): Promise<ThreadsPost[]> {
  if (!accessToken.trim()) throw new Error("Threads access token is required.");
  const url = new URL("https://graph.threads.net/v1.0/me/threads");
  url.searchParams.set("fields", "id,text,media_type,media_url,permalink,timestamp");
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 50)));

  const response = await fetcher(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as ThreadsListPayload;
  if (!response.ok) throw new Error(payload.error?.message ?? `Threads content list failed with status ${response.status}.`);
  return payload.data ?? [];
}

export type ThreadsSyncResult = { synced: number; skipped: number };

// Syncs one tenant's connected Threads account -- fetches recent posts and upserts them into
// published_content_items (idempotent on external_post_id). Returns undefined, not a guess, when
// the tenant has no connected Threads account or the token vault isn't configured.
export async function syncThreadsContent(organizationId: string, connectionId?: string, fetcher: typeof fetch = fetch): Promise<ThreadsSyncResult | undefined> {
  const resolved = await resolveSocialConnectionToken(organizationId, "threads", connectionId);
  if (!resolved) return undefined;

  const posts = await fetchThreadsPosts(resolved.accessToken, 25, fetcher);
  let synced = 0;
  let skipped = 0;
  for (const post of posts) {
    if (!post.id) { skipped += 1; continue; }
    const item = await upsertPublishedContentItem({
      organizationId: resolved.organizationId,
      providerId: "threads",
      connectionId: resolved.connectionId,
      platformSurface: "threads",
      externalPostId: post.id,
      contentType: contentTypeFromMediaType(post.media_type),
      caption: post.text,
      mediaUrls: post.media_url ? [post.media_url] : [],
      status: "published",
      publishedAt: post.timestamp,
      permalink: post.permalink,
    });
    if (item) synced += 1; else skipped += 1;
  }
  return { synced, skipped };
}
