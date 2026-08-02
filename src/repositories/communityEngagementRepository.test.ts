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

import { listCommunityEngagementItems, markCommunityEngagementDismissed, markCommunityEngagementReplied, upsertCommunityEngagementItem } from "./communityEngagementRepository";

const scope = { organizationId: "org-1", userId: "user-1", role: "Manager" as const };

function engagementRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "eng-1", organization_id: "org-1", provider_id: "threads", connection_id: null,
    platform_surface: "threads", engagement_type: "reply", external_engagement_id: "17800000000000001",
    related_content_id: null, author_handle: "@stakeholder", author_display_name: "A Stakeholder",
    body_text: "When is the next update?", sentiment: "neutral", status: "open",
    received_at: "2026-08-02T00:00:00.000Z", replied_at: null, replied_by: null, metadata: {},
    created_at: "2026-08-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("communityEngagementRepository", () => {
  afterEach(() => {
    state.calls = [];
    state.responses = [];
    state.isConfigured = true;
    vi.clearAllMocks();
  });

  it("returns a genuinely empty list for a tenant with no open engagement, not fabricated comments", async () => {
    state.responses = [[]];
    const items = await listCommunityEngagementItems(scope);
    expect(items).toEqual([]);
  });

  it("defaults to status='open' and scopes to the requesting organization only", async () => {
    state.responses = [[]];
    await listCommunityEngagementItems({ ...scope, organizationId: "org-42" });
    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("organization_id")).toBe("eq.org-42");
    expect(query.get("status")).toBe("eq.open");
  });

  it("upserts on the (organization_id, provider_id, external_engagement_id) conflict target", async () => {
    state.responses = [[engagementRow()]];
    const item = await upsertCommunityEngagementItem({
      organizationId: "org-1", providerId: "threads", platformSurface: "threads",
      engagementType: "reply", externalEngagementId: "17800000000000001", bodyText: "When is the next update?",
    });
    expect(item?.bodyText).toBe("When is the next update?");
    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("on_conflict")).toBe("organization_id,provider_id,external_engagement_id");
  });

  it("marking replied scopes by id AND organization_id and stamps the replying user", async () => {
    state.responses = [[engagementRow({ status: "replied", replied_at: "2026-08-02T01:00:00.000Z", replied_by: "user-1" })]];
    const item = await markCommunityEngagementReplied(scope, "eng-1");
    expect(item?.status).toBe("replied");
    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("id")).toBe("eq.eng-1");
    expect(query.get("organization_id")).toBe("eq.org-1");
    const body = state.calls[0].options.body as Record<string, unknown>;
    expect(body.replied_by).toBe("user-1");
  });

  it("marking dismissed does not stamp replied_at/replied_by", async () => {
    state.responses = [[engagementRow({ status: "dismissed" })]];
    await markCommunityEngagementDismissed(scope, "eng-1");
    const body = state.calls[0].options.body as Record<string, unknown>;
    expect(body.status).toBe("dismissed");
    expect(body.replied_at).toBeUndefined();
  });
});
