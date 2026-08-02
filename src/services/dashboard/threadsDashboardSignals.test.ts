import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  isConfigured: true,
  connectionRows: [] as unknown[],
  contentRows: [] as unknown[],
  engagementRows: [] as unknown[],
};

vi.mock("../../repositories/supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => state.isConfigured,
  supabaseAdminRest: async (table: string) => {
    if (table === "integration_connections") return state.connectionRows;
    if (table === "published_content_items") return state.contentRows;
    if (table === "community_engagement_items") return state.engagementRows;
    return [];
  },
}));

import { getThreadsDashboardSignals } from "./threadsDashboardSignals";

describe("getThreadsDashboardSignals", () => {
  afterEach(() => {
    state.isConfigured = true;
    state.connectionRows = [];
    state.contentRows = [];
    state.engagementRows = [];
    vi.clearAllMocks();
  });

  it("returns a genuinely honest all-false/zero result when Supabase admin isn't configured", async () => {
    state.isConfigured = false;
    const signals = await getThreadsDashboardSignals("org-1");
    expect(signals).toEqual({ oauthConnected: false, recentPostCount: 0, openReplyCount: 0 });
  });

  it("reports not connected when the tenant has no connected Threads OAuth row", async () => {
    state.connectionRows = [];
    const signals = await getThreadsDashboardSignals("org-1");
    expect(signals.oauthConnected).toBe(false);
  });

  it("reports a genuine zero for a connected tenant that has never synced -- not a fabricated count", async () => {
    state.connectionRows = [{ provider_id: "threads", status: "connected" }];
    state.contentRows = [];
    state.engagementRows = [];
    const signals = await getThreadsDashboardSignals("org-1");
    expect(signals).toEqual({ oauthConnected: true, recentPostCount: 0, openReplyCount: 0 });
  });

  it("reports real counts once content/engagement rows exist", async () => {
    state.connectionRows = [{ provider_id: "threads", status: "connected" }];
    state.contentRows = [{ id: "post-1" }, { id: "post-2" }];
    state.engagementRows = [{ id: "eng-1" }];
    const signals = await getThreadsDashboardSignals("org-1");
    expect(signals).toEqual({ oauthConnected: true, recentPostCount: 2, openReplyCount: 1 });
  });
});
