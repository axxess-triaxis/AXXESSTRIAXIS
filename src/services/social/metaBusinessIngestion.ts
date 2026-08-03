// MC-4 (2026-08-02): pull-based Meta Business Suite ingestion -- Facebook Page content and Ads
// Manager campaigns. Same fetch/parse shape as microsoftGraphMailbox.ts. Deliberately scoped to
// content + campaigns this pass; Instagram content and community engagement (comments/DMs) are NOT
// built here -- comments require heavy per-post fan-out and DMs need the separate Messenger
// Platform API (a different auth/webhook model), both explicitly deferred, not silently skipped.
import type { CampaignStatus } from "../../domain";
import { upsertCampaignPromotion } from "../../repositories/campaignsRepository";
import { upsertPublishedContentItem } from "../../repositories/publishedContentRepository";
import { resolveSocialConnectionToken } from "./socialConnectionToken";

const GRAPH_API_VERSION = "v19.0";

export type FacebookPage = { id: string; name?: string; access_token?: string };
type FacebookPagesPayload = { data?: FacebookPage[]; error?: { message?: string } };

export type FacebookPost = { id: string; message?: string; created_time?: string; permalink_url?: string };
type FacebookPostsPayload = { data?: FacebookPost[]; error?: { message?: string } };

export type FacebookAdAccount = { id: string; name?: string };
type FacebookAdAccountsPayload = { data?: FacebookAdAccount[]; error?: { message?: string } };

export type FacebookCampaign = {
  id: string;
  name: string;
  objective?: string;
  status?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  insights?: { data?: Array<{ spend?: string; reach?: string; clicks?: string }> };
};
type FacebookCampaignsPayload = { data?: FacebookCampaign[]; error?: { message?: string } };

async function graphGet<TPayload>(path: string, accessToken: string, params: Record<string, string>, fetcher: typeof fetch): Promise<TPayload> {
  const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetcher(url, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }, cache: "no-store" });
  const payload = await response.json().catch(() => ({})) as TPayload & { error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message ?? `Meta Graph API request failed with status ${response.status}.`);
  return payload;
}

export async function fetchFacebookPages(accessToken: string, fetcher: typeof fetch = fetch): Promise<FacebookPage[]> {
  const payload = await graphGet<FacebookPagesPayload>("me/accounts", accessToken, { fields: "id,name,access_token" }, fetcher);
  return payload.data ?? [];
}

export async function fetchFacebookPagePosts(pageId: string, pageAccessToken: string, fetcher: typeof fetch = fetch): Promise<FacebookPost[]> {
  const payload = await graphGet<FacebookPostsPayload>(`${pageId}/posts`, pageAccessToken, { fields: "id,message,created_time,permalink_url", limit: "25" }, fetcher);
  return payload.data ?? [];
}

export async function fetchFacebookAdAccounts(accessToken: string, fetcher: typeof fetch = fetch): Promise<FacebookAdAccount[]> {
  const payload = await graphGet<FacebookAdAccountsPayload>("me/adaccounts", accessToken, { fields: "id,name" }, fetcher);
  return payload.data ?? [];
}

export async function fetchFacebookCampaigns(adAccountId: string, accessToken: string, fetcher: typeof fetch = fetch): Promise<FacebookCampaign[]> {
  const payload = await graphGet<FacebookCampaignsPayload>(`${adAccountId}/campaigns`, accessToken, {
    fields: "id,name,objective,status,daily_budget,lifetime_budget,insights{spend,reach,clicks}",
    limit: "50",
  }, fetcher);
  return payload.data ?? [];
}

function campaignStatusFromGraph(status: string | undefined): CampaignStatus {
  switch (status) {
    case "ACTIVE": return "active";
    case "PAUSED": return "paused";
    case "ARCHIVED": return "archived";
    case "COMPLETED": return "completed";
    default: return "draft";
  }
}

export type MetaBusinessSyncResult = { pagesSynced: number; postsSynced: number; campaignsSynced: number };

// Syncs one tenant's connected Meta Business Suite account: lists the tenant's Facebook Pages,
// pulls recent posts per page, then lists ad accounts and pulls active campaigns. Returns
// undefined, not a guess, when the tenant has no connected meta_business account.
export async function syncMetaBusinessContent(organizationId: string, connectionId?: string, fetcher: typeof fetch = fetch): Promise<MetaBusinessSyncResult | undefined> {
  const resolved = await resolveSocialConnectionToken(organizationId, "meta_business", connectionId);
  if (!resolved) return undefined;

  const pages = await fetchFacebookPages(resolved.accessToken, fetcher);
  let postsSynced = 0;
  for (const page of pages) {
    if (!page.id || !page.access_token) continue;
    const posts = await fetchFacebookPagePosts(page.id, page.access_token, fetcher).catch(() => []);
    for (const post of posts) {
      if (!post.id) continue;
      const item = await upsertPublishedContentItem({
        organizationId: resolved.organizationId,
        providerId: "meta_business",
        connectionId: resolved.connectionId,
        platformSurface: "facebook_page",
        externalPostId: post.id,
        contentType: "text",
        caption: post.message,
        status: "published",
        publishedAt: post.created_time,
        permalink: post.permalink_url,
      });
      if (item) postsSynced += 1;
    }
  }

  const adAccounts = await fetchFacebookAdAccounts(resolved.accessToken, fetcher).catch(() => []);
  let campaignsSynced = 0;
  for (const adAccount of adAccounts) {
    if (!adAccount.id) continue;
    const campaigns = await fetchFacebookCampaigns(adAccount.id, resolved.accessToken, fetcher).catch(() => []);
    for (const campaign of campaigns) {
      if (!campaign.id) continue;
      const insights = campaign.insights?.data?.[0];
      const item = await upsertCampaignPromotion({
        organizationId: resolved.organizationId,
        providerId: "meta_business",
        connectionId: resolved.connectionId,
        externalCampaignId: campaign.id,
        name: campaign.name,
        objective: campaign.objective,
        status: campaignStatusFromGraph(campaign.status),
        budgetAmount: campaign.daily_budget ? Number(campaign.daily_budget) / 100 : campaign.lifetime_budget ? Number(campaign.lifetime_budget) / 100 : undefined,
        spendAmount: insights?.spend ? Number(insights.spend) : 0,
        reachCount: insights?.reach ? Number(insights.reach) : 0,
        clickCount: insights?.clicks ? Number(insights.clicks) : 0,
      });
      if (item) campaignsSynced += 1;
    }
  }

  return { pagesSynced: pages.length, postsSynced, campaignsSynced };
}
