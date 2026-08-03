import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  isConfigured: true,
  connectionRows: [] as unknown[],
  contentRows: [] as unknown[],
  campaignRows: [] as unknown[],
};

vi.mock("../../repositories/supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => state.isConfigured,
  supabaseAdminRest: async (table: string) => {
    if (table === "integration_connections") return state.connectionRows;
    if (table === "published_content_items") return state.contentRows;
    if (table === "campaigns_promotions") return state.campaignRows;
    return [];
  },
}));

import { getMetaBusinessDashboardSignals } from "./metaBusinessDashboardSignals";

describe("getMetaBusinessDashboardSignals", () => {
  afterEach(() => {
    state.isConfigured = true;
    state.connectionRows = [];
    state.contentRows = [];
    state.campaignRows = [];
    vi.clearAllMocks();
  });

  it("returns a genuinely honest all-false/zero result when Supabase admin isn't configured", async () => {
    state.isConfigured = false;
    const signals = await getMetaBusinessDashboardSignals("org-1");
    expect(signals).toEqual({ oauthConnected: false, recentPostCount: 0, activeCampaignCount: 0, overBudgetCampaignCount: 0 });
  });

  it("reports not connected when the tenant has no connected meta_business OAuth row", async () => {
    state.connectionRows = [];
    const signals = await getMetaBusinessDashboardSignals("org-1");
    expect(signals.oauthConnected).toBe(false);
  });

  it("reports a genuine zero for a connected tenant that has never synced", async () => {
    state.connectionRows = [{ provider_id: "meta_business", status: "connected" }];
    const signals = await getMetaBusinessDashboardSignals("org-1");
    expect(signals).toEqual({ oauthConnected: true, recentPostCount: 0, activeCampaignCount: 0, overBudgetCampaignCount: 0 });
  });

  it("counts only campaigns whose spend has actually exceeded their own budget as over-budget", async () => {
    state.connectionRows = [{ provider_id: "meta_business", status: "connected" }];
    state.contentRows = [{ id: "post-1" }];
    state.campaignRows = [
      { id: "camp-1", budget_amount: 100, spend_amount: 150 },
      { id: "camp-2", budget_amount: 100, spend_amount: 50 },
      { id: "camp-3", budget_amount: null, spend_amount: 9999 },
    ];
    const signals = await getMetaBusinessDashboardSignals("org-1");
    expect(signals).toEqual({ oauthConnected: true, recentPostCount: 1, activeCampaignCount: 3, overBudgetCampaignCount: 1 });
  });
});
