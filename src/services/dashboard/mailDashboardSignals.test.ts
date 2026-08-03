import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  isConfigured: true,
  calls: [] as Array<{ table: string; options: Record<string, unknown> }>,
  responses: new Map<string, unknown>(),
};

vi.mock("../../repositories/supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => state.isConfigured,
  supabaseAdminRest: async (table: string, options: Record<string, unknown>) => {
    state.calls.push({ table, options });
    const query = options.query as URLSearchParams;
    const providerId = query.get("provider_id")?.replace(/^eq\./, "");
    const key = providerId ? `${table}:${providerId}` : table;
    return state.responses.get(key) ?? [];
  },
}));

import { getMailDashboardSignals } from "./mailDashboardSignals";

function connectionRow(providerId: string) {
  return [{ provider_id: providerId, status: "connected" }];
}

function previewedRow(daysAgo: number) {
  return { status: "previewed", created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString() };
}

describe("getMailDashboardSignals", () => {
  afterEach(() => {
    state.calls = [];
    state.responses = new Map();
    state.isConfigured = true;
    vi.clearAllMocks();
  });

  it("reports no provider connected and zero needing-reply when nothing is wired", async () => {
    const signals = await getMailDashboardSignals("org-1");
    expect(signals).toEqual({ gmailConnected: false, microsoftConnected: false, needingReplyCount: 0, oldestNeedingReplyDays: null });
  });

  it("reports a connected provider with no previewed mail as zero, not fake data", async () => {
    state.responses.set("integration_connections:gmail", connectionRow("gmail"));
    const signals = await getMailDashboardSignals("org-1");
    expect(signals.gmailConnected).toBe(true);
    expect(signals.needingReplyCount).toBe(0);
    expect(signals.oldestNeedingReplyDays).toBeNull();
  });

  it("counts previewed Gmail and Microsoft rows together as mail needing reply", async () => {
    state.responses.set("integration_connections:gmail", connectionRow("gmail"));
    state.responses.set("integration_connections:microsoft", connectionRow("microsoft"));
    state.responses.set("gmail_selected_message_imports", [previewedRow(1)]);
    state.responses.set("microsoft_selected_message_imports", [previewedRow(2)]);

    const signals = await getMailDashboardSignals("org-1");

    expect(signals.needingReplyCount).toBe(2);
    expect(signals.oldestNeedingReplyDays).toBe(2);
  });

  it("surfaces the oldest previewed message's age for staleness-based escalation", async () => {
    state.responses.set("gmail_selected_message_imports", [previewedRow(1), previewedRow(7)]);

    const signals = await getMailDashboardSignals("org-1");

    expect(signals.oldestNeedingReplyDays).toBe(7);
  });

  it("scopes every query to the requesting organization only (tenant isolation)", async () => {
    await getMailDashboardSignals("org-42");
    for (const call of state.calls) {
      const query = call.options.query as URLSearchParams;
      expect(query.get("organization_id")).toBe("eq.org-42");
    }
  });

  it("returns an honest zero state (never throws, never fabricates) when Supabase admin is not configured", async () => {
    state.isConfigured = false;
    const signals = await getMailDashboardSignals("org-1");
    expect(signals).toEqual({ gmailConnected: false, microsoftConnected: false, needingReplyCount: 0, oldestNeedingReplyDays: null });
    expect(state.calls.length).toBe(0);
  });
});
