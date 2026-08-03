import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  isConfigured: true,
  calls: [] as Array<{ table: string; options: Record<string, unknown> }>,
  responses: [] as unknown[],
};

vi.mock("./supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => state.isConfigured,
  supabaseAdminRest: async (table: string, options: Record<string, unknown>) => {
    state.calls.push({ table, options });
    return state.responses.shift();
  },
}));

import { listCampaignsPromotions, upsertCampaignPromotion } from "./campaignsRepository";

const scope = { organizationId: "org-1", userId: "user-1", role: "Manager" as const };

function campaignRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "camp-1", organization_id: "org-1", provider_id: "meta_business", connection_id: null,
    external_campaign_id: "6081234567890", name: "August pilot awareness", objective: "REACH",
    status: "active", budget_amount: 500, budget_currency: "USD", spend_amount: 120,
    start_at: "2026-08-01T00:00:00.000Z", end_at: null, reach_count: 12000, click_count: 340,
    conversion_count: 8, metadata: {}, created_by: null,
    created_at: "2026-08-02T00:00:00.000Z", updated_at: "2026-08-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("campaignsRepository", () => {
  afterEach(() => {
    state.calls = [];
    state.responses = [];
    state.isConfigured = true;
    vi.clearAllMocks();
  });

  it("returns a genuinely empty list for a tenant with no campaigns, not fabricated ad spend", async () => {
    state.responses = [[]];
    const items = await listCampaignsPromotions(scope);
    expect(items).toEqual([]);
  });

  it("scopes list queries to the requesting organization only", async () => {
    state.responses = [[]];
    await listCampaignsPromotions({ ...scope, organizationId: "org-42" });
    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("organization_id")).toBe("eq.org-42");
  });

  it("upserts on the (organization_id, provider_id, external_campaign_id) conflict target, refreshing spend/reach counts", async () => {
    state.responses = [[campaignRow({ spend_amount: 150 })]];
    const item = await upsertCampaignPromotion({
      organizationId: "org-1", providerId: "meta_business", externalCampaignId: "6081234567890",
      name: "August pilot awareness", spendAmount: 150,
    });
    expect(item?.spendAmount).toBe(150);
    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("on_conflict")).toBe("organization_id,provider_id,external_campaign_id");
  });
});
