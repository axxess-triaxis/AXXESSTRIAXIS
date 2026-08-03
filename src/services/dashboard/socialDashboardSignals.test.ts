import { afterEach, describe, expect, it, vi } from "vitest";

type ProviderStatus = { provider: "x" | "facebook"; configured: boolean; mode: string };

const state = {
  isConfigured: true,
  calls: [] as Array<{ table: string; options: Record<string, unknown> }>,
  response: undefined as unknown,
  shouldThrow: false,
  providers: [
    { provider: "x", configured: false, mode: "provider-gated" },
    { provider: "facebook", configured: false, mode: "provider-gated" },
  ] as ProviderStatus[],
};

vi.mock("../../repositories/supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => state.isConfigured,
  supabaseAdminRest: async (table: string, options: Record<string, unknown>) => {
    state.calls.push({ table, options });
    if (state.shouldThrow) throw new Error("Supabase admin request failed");
    return state.response;
  },
}));

vi.mock("../alerts/socialAlerts", () => ({
  getSocialAlertProviderStatus: () => state.providers,
}));

import { getSocialDashboardSignals } from "./socialDashboardSignals";

function setProviders(x: boolean, facebook: boolean) {
  state.providers = [
    { provider: "x", configured: x, mode: "provider-gated" },
    { provider: "facebook", configured: facebook, mode: "provider-gated" },
  ];
}

describe("getSocialDashboardSignals", () => {
  afterEach(() => {
    state.calls = [];
    state.response = undefined;
    state.isConfigured = true;
    state.shouldThrow = false;
    setProviders(false, false);
    vi.clearAllMocks();
  });

  it("reports no provider configured and a genuine (not fabricated) zero alert count", async () => {
    state.response = [];
    const signals = await getSocialDashboardSignals("org-1");
    expect(signals).toEqual({ criticalAlertCount: 0, queryRan: true, xConfigured: false, facebookConfigured: false });
  });

  it("reports a configured provider with zero real events as an honest empty query, not fake data", async () => {
    setProviders(true, false);
    state.response = [];
    const signals = await getSocialDashboardSignals("org-1");
    expect(signals.xConfigured).toBe(true);
    expect(signals.criticalAlertCount).toBe(0);
    expect(signals.queryRan).toBe(true);
  });

  it("counts real unreviewed high-urgency events as critical alerts", async () => {
    state.response = [
      { urgency: "high", reviewed_at: null },
      { urgency: "high", reviewed_at: null },
    ];
    const signals = await getSocialDashboardSignals("org-1");
    expect(signals.criticalAlertCount).toBe(2);
  });

  it("scopes the events query to the requesting organization and to unreviewed high-urgency rows only", async () => {
    state.response = [];
    await getSocialDashboardSignals("org-42");
    const eventsCall = state.calls.find((call) => call.table === "social_alert_events");
    const query = eventsCall?.options.query as URLSearchParams;
    expect(query.get("organization_id")).toBe("eq.org-42");
    expect(query.get("urgency")).toBe("eq.high");
    expect(query.get("reviewed_at")).toBe("is.null");
  });

  it("marks queryRan false (not a fabricated zero) when the live query itself fails", async () => {
    state.shouldThrow = true;
    const signals = await getSocialDashboardSignals("org-1");
    expect(signals.queryRan).toBe(false);
    expect(signals.criticalAlertCount).toBe(0);
  });

  it("skips the query entirely and reports queryRan false when Supabase admin isn't configured", async () => {
    state.isConfigured = false;
    const signals = await getSocialDashboardSignals("org-1");
    expect(signals.queryRan).toBe(false);
    expect(state.calls.length).toBe(0);
  });
});
