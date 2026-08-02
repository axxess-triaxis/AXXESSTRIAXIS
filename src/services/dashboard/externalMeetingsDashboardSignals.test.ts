import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  isConfigured: true,
  calls: [] as Array<{ table: string; options: Record<string, unknown> }>,
  connected: new Set<string>(),
};

vi.mock("../../repositories/supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => state.isConfigured,
  supabaseAdminRest: async (table: string, options: Record<string, unknown>) => {
    state.calls.push({ table, options });
    const query = options.query as URLSearchParams;
    const providerId = query.get("provider_id")?.replace(/^eq\./, "");
    return providerId && state.connected.has(providerId) ? [{ provider_id: providerId, status: "connected" }] : [];
  },
}));

import { getExternalMeetingsDashboardSignals } from "./externalMeetingsDashboardSignals";

describe("getExternalMeetingsDashboardSignals", () => {
  afterEach(() => {
    state.calls = [];
    state.connected = new Set();
    state.isConfigured = true;
    vi.clearAllMocks();
  });

  it("reports neither provider connected by default", async () => {
    const signals = await getExternalMeetingsDashboardSignals("org-1");
    expect(signals).toEqual({ zoomOAuthConnected: false, googleCalendarOAuthConnected: false });
  });

  it("reports Zoom OAuth connection independently of Google Calendar", async () => {
    state.connected.add("zoom");
    const signals = await getExternalMeetingsDashboardSignals("org-1");
    expect(signals.zoomOAuthConnected).toBe(true);
    expect(signals.googleCalendarOAuthConnected).toBe(false);
  });

  it("scopes every query to the requesting organization only", async () => {
    await getExternalMeetingsDashboardSignals("org-42");
    for (const call of state.calls) {
      const query = call.options.query as URLSearchParams;
      expect(query.get("organization_id")).toBe("eq.org-42");
    }
  });

  it("returns an honest false/false state when Supabase admin isn't configured", async () => {
    state.isConfigured = false;
    const signals = await getExternalMeetingsDashboardSignals("org-1");
    expect(signals).toEqual({ zoomOAuthConnected: false, googleCalendarOAuthConnected: false });
    expect(state.calls.length).toBe(0);
  });
});
