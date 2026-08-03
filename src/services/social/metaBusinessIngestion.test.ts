import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  resolved: undefined as { connectionId: string; organizationId: string; accessToken: string } | undefined,
  contentUpserts: [] as Array<Record<string, unknown>>,
  campaignUpserts: [] as Array<Record<string, unknown>>,
};

vi.mock("./socialConnectionToken", () => ({
  resolveSocialConnectionToken: async () => state.resolved,
}));

vi.mock("../../repositories/publishedContentRepository", () => ({
  upsertPublishedContentItem: async (input: Record<string, unknown>) => {
    state.contentUpserts.push(input);
    return { id: `content-${state.contentUpserts.length}`, ...input };
  },
}));

vi.mock("../../repositories/campaignsRepository", () => ({
  upsertCampaignPromotion: async (input: Record<string, unknown>) => {
    state.campaignUpserts.push(input);
    return { id: `campaign-${state.campaignUpserts.length}`, ...input };
  },
}));

import { fetchFacebookCampaigns, fetchFacebookPagePosts, fetchFacebookPages, syncMetaBusinessContent } from "./metaBusinessIngestion";

function jsonFetcher(payload: unknown, ok = true) {
  return vi.fn().mockResolvedValue({ ok, json: async () => payload });
}

describe("Meta Graph API fetch functions", () => {
  it("fetches connected Pages with their own page access tokens", async () => {
    const fetcher = jsonFetcher({ data: [{ id: "page-1", name: "AXXESS TRIaxis", access_token: "page-token" }] });
    const pages = await fetchFacebookPages("user-token", fetcher as unknown as typeof fetch);
    expect(pages).toEqual([{ id: "page-1", name: "AXXESS TRIaxis", access_token: "page-token" }]);
  });

  it("fetches a page's posts using the page's own access token, not the user token", async () => {
    const fetcher = jsonFetcher({ data: [{ id: "post-1", message: "Hello Page" }] });
    await fetchFacebookPagePosts("page-1", "page-token", fetcher as unknown as typeof fetch);
    const requestUrl = (fetcher.mock.calls[0][0] as URL).toString();
    expect(requestUrl).toContain("page-1/posts");
  });

  it("throws the real Graph API error message on failure", async () => {
    const fetcher = jsonFetcher({ error: { message: "Insufficient permissions." } }, false);
    await expect(fetchFacebookCampaigns("act_1", "token", fetcher as unknown as typeof fetch)).rejects.toThrow("Insufficient permissions.");
  });
});

describe("syncMetaBusinessContent", () => {
  afterEach(() => {
    state.resolved = undefined;
    state.contentUpserts = [];
    state.campaignUpserts = [];
    vi.clearAllMocks();
  });

  it("returns undefined (not a guess) when the tenant has no connected Meta Business Suite account", async () => {
    const result = await syncMetaBusinessContent("org-1");
    expect(result).toBeUndefined();
  });

  it("syncs pages, their posts, ad accounts, and campaigns for the resolved tenant connection", async () => {
    state.resolved = { connectionId: "conn-1", organizationId: "org-1", accessToken: "user-token" };
    const responses = [
      { data: [{ id: "page-1", name: "AXXESS TRIaxis", access_token: "page-token" }] }, // me/accounts
      { data: [{ id: "post-1", message: "Hello Page", created_time: "2026-08-02T00:00:00.000Z" }] }, // page posts
      { data: [{ id: "act_1", name: "Main ad account" }] }, // me/adaccounts
      { data: [{ id: "camp-1", name: "August pilot", status: "ACTIVE", insights: { data: [{ spend: "42.50", reach: "1000", clicks: "12" }] } }] }, // campaigns
    ];
    let call = 0;
    const fetcher = vi.fn().mockImplementation(async () => ({ ok: true, json: async () => responses[call++] }));

    const result = await syncMetaBusinessContent("org-1", undefined, fetcher as unknown as typeof fetch);
    expect(result).toEqual({ pagesSynced: 1, postsSynced: 1, campaignsSynced: 1 });
    expect(state.contentUpserts[0]).toMatchObject({ organizationId: "org-1", providerId: "meta_business", platformSurface: "facebook_page", externalPostId: "post-1" });
    expect(state.campaignUpserts[0]).toMatchObject({ organizationId: "org-1", providerId: "meta_business", externalCampaignId: "camp-1", status: "active", spendAmount: 42.5 });
  });

  it("skips a page with no page-level access token rather than fabricating one", async () => {
    state.resolved = { connectionId: "conn-1", organizationId: "org-1", accessToken: "user-token" };
    const fetcher = jsonFetcher({ data: [{ id: "page-1", name: "No token page" }] });
    const result = await syncMetaBusinessContent("org-1", undefined, fetcher as unknown as typeof fetch);
    expect(result?.postsSynced).toBe(0);
    expect(state.contentUpserts.length).toBe(0);
  });
});
