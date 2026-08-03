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

import { listPublishedContentItems, upsertPublishedContentItem } from "./publishedContentRepository";

const scope = { organizationId: "org-1", userId: "user-1", role: "Manager" as const };

function contentRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "post-1", organization_id: "org-1", provider_id: "threads", connection_id: null,
    platform_surface: "threads", external_post_id: "17800000000000000", content_type: "text",
    caption: "Hello Threads", media_urls: [], status: "published", scheduled_at: null,
    published_at: "2026-08-02T00:00:00.000Z", permalink: "https://threads.net/@axxess/post/1",
    like_count: 3, comment_count: 1, share_count: 0, impression_count: 100, metadata: {},
    created_by: null, created_at: "2026-08-02T00:00:00.000Z", updated_at: "2026-08-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("publishedContentRepository", () => {
  afterEach(() => {
    state.calls = [];
    state.responses = [];
    state.isConfigured = true;
    vi.clearAllMocks();
  });

  it("returns a genuinely empty list for a tenant with no content, not fabricated posts", async () => {
    state.responses = [[]];
    const items = await listPublishedContentItems(scope);
    expect(items).toEqual([]);
  });

  it("filters by providerId when given, scoped to the requesting organization only", async () => {
    state.responses = [[]];
    await listPublishedContentItems({ ...scope, organizationId: "org-42" }, "threads");
    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("organization_id")).toBe("eq.org-42");
    expect(query.get("provider_id")).toBe("eq.threads");
  });

  it("upserts on the (organization_id, provider_id, external_post_id) conflict target, idempotent for repeated sync runs", async () => {
    state.responses = [[contentRow()]];
    const item = await upsertPublishedContentItem({
      organizationId: "org-1", providerId: "threads", platformSurface: "threads",
      externalPostId: "17800000000000000", contentType: "text", caption: "Hello Threads",
    });
    expect(item?.caption).toBe("Hello Threads");
    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("on_conflict")).toBe("organization_id,provider_id,external_post_id");
    expect(state.calls[0].options.prefer).toBe("resolution=merge-duplicates,return=representation");
  });
});
