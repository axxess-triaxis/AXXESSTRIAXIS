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

import { listSocialAlertEvents, upsertSocialAlertEvent } from "./socialAlertEventsRepository";

const scope = { organizationId: "org-1", userId: "user-1", role: "Manager" as const };

function eventRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "event-1", organization_id: "org-1", rule_id: "rule-1", provider: "brand24",
    title: "District hospital reports oxygen shortage", source_account: "@localnews",
    sentiment: "negative", urgency: "high", action_targets: [],
    received_at: "2026-08-17T08:00:00.000Z", reviewed_at: null, reviewed_by: null,
    external_id: "mention-1", metadata: { topic: "healthcare funding" },
    ...overrides,
  };
}

describe("socialAlertEventsRepository", () => {
  afterEach(() => {
    state.calls = [];
    state.responses = [];
    state.isConfigured = true;
    vi.clearAllMocks();
  });

  it("returns a genuinely empty list for a tenant with no matched events, not fabricated ones", async () => {
    state.responses = [[]];
    const events = await listSocialAlertEvents(scope);
    expect(events).toEqual([]);
  });

  it("scopes the read to the requesting organization only", async () => {
    state.responses = [[]];
    await listSocialAlertEvents({ ...scope, organizationId: "org-42" });
    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("organization_id")).toBe("eq.org-42");
  });

  it("upserts on the (organization_id, provider, rule_id, external_id) conflict target, idempotent for repeated cron runs", async () => {
    state.responses = [[eventRow()]];
    const event = await upsertSocialAlertEvent({
      organizationId: "org-1", ruleId: "rule-1", provider: "brand24",
      title: "District hospital reports oxygen shortage", sourceAccount: "@localnews",
      sentiment: "negative", urgency: "high", receivedAt: "2026-08-17T08:00:00.000Z",
      externalId: "mention-1",
    });
    expect(event?.title).toBe("District hospital reports oxygen shortage");
    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("on_conflict")).toBe("organization_id,provider,rule_id,external_id");
    expect(state.calls[0].options.prefer).toBe("resolution=merge-duplicates,return=representation");
  });

  it("returns undefined rather than throwing when Supabase admin isn't configured", async () => {
    state.isConfigured = false;
    const event = await upsertSocialAlertEvent({
      organizationId: "org-1", ruleId: "rule-1", provider: "brand24",
      title: "t", sourceAccount: "a", sentiment: "neutral", urgency: "low",
      receivedAt: "2026-08-17T08:00:00.000Z", externalId: "mention-2",
    });
    expect(event).toBeUndefined();
    expect(state.calls).toHaveLength(0);
  });
});
