import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// A-91 (2026-08-03): the 8 Executive Dashboard signal hooks (mail, CRM, social, calendar,
// external meetings, financial watch, Threads, Meta Business) had no demo-mode branch -- on
// investor.triaxisventures.com (a pseudo-org with no real connector data) they all genuinely
// returned empty/not-connected, which reads as broken on the investor demo though it's correct
// for a real tenant. Each hook now checks isDemoModeEnabled() first and short-circuits to a
// curated demo payload without ever calling its real API route. These tests prove: (1) demo mode
// on returns the demo data with zero fetch calls, (2) demo mode off is completely unaffected --
// same fetch-based behavior as before, so landing.triaxisventures.com's real empty-states are
// untouched.
const state = { demoModeEnabled: false };

vi.mock("../demo/demoMode", () => ({
  isDemoModeEnabled: () => state.demoModeEnabled,
}));

const scope = { organizationId: "org_a", userId: "user_a", role: "Organization Admin" } as never;

describe("Executive Dashboard signal hooks -- demo mode (A-91)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    state.demoModeEnabled = false;
  });

  it("useMailDashboardSignals: demo mode returns demo data, never calls fetch", async () => {
    state.demoModeEnabled = true;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { useMailDashboardSignals } = await import("./useMailDashboardSignals");

    const { result } = renderHook(() => useMailDashboardSignals(scope));

    await waitFor(() => expect(result.current?.needingReplyCount).toBe(6));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("useMailDashboardSignals: demo mode off still fetches normally (real tenant unaffected)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ gmailConnected: false, microsoftConnected: false, needingReplyCount: 0, oldestNeedingReplyDays: null }) });
    vi.stubGlobal("fetch", fetchMock);
    const { useMailDashboardSignals } = await import("./useMailDashboardSignals");

    renderHook(() => useMailDashboardSignals(scope));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/dashboard/mail-signals", expect.objectContaining({ credentials: "include" })));
  });

  it("useCrmLeads: demo mode returns demo leads, never calls fetch", async () => {
    state.demoModeEnabled = true;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { useCrmLeads } = await import("./useCrmLeads");

    const { result } = renderHook(() => useCrmLeads(scope));

    await waitFor(() => expect(result.current?.length).toBe(10));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("useSocialDashboardSignals: demo mode returns demo data, never calls fetch", async () => {
    state.demoModeEnabled = true;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { useSocialDashboardSignals } = await import("./useSocialDashboardSignals");

    const { result } = renderHook(() => useSocialDashboardSignals(scope));

    await waitFor(() => expect(result.current?.criticalAlertCount).toBe(2));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("useCalendarSignals: demo mode returns demo data, never calls fetch", async () => {
    state.demoModeEnabled = true;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { useCalendarSignals } = await import("./useCalendarSignals");

    const { result } = renderHook(() => useCalendarSignals(scope));

    await waitFor(() => expect(result.current?.todayCount).toBe(3));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("useExternalMeetingsSignals: demo mode returns demo data, never calls fetch", async () => {
    state.demoModeEnabled = true;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { useExternalMeetingsSignals } = await import("./useExternalMeetingsSignals");

    const { result } = renderHook(() => useExternalMeetingsSignals(scope));

    await waitFor(() => expect(result.current?.zoomOAuthConnected).toBe(true));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("useFinancialWatchItems: demo mode returns demo items, never calls fetch", async () => {
    state.demoModeEnabled = true;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { useFinancialWatchItems } = await import("./useFinancialWatchItems");

    const { result } = renderHook(() => useFinancialWatchItems(scope));

    await waitFor(() => expect(result.current?.length).toBe(7));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("useThreadsDashboardSignals: demo mode returns demo data, never calls fetch", async () => {
    state.demoModeEnabled = true;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { useThreadsDashboardSignals } = await import("./useThreadsDashboardSignals");

    const { result } = renderHook(() => useThreadsDashboardSignals(scope));

    await waitFor(() => expect(result.current?.recentPostCount).toBe(14));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("useMetaBusinessDashboardSignals: demo mode returns demo data, never calls fetch", async () => {
    state.demoModeEnabled = true;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { useMetaBusinessDashboardSignals } = await import("./useMetaBusinessDashboardSignals");

    const { result } = renderHook(() => useMetaBusinessDashboardSignals(scope));

    await waitFor(() => expect(result.current?.recentPostCount).toBe(22));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("computeCrmDashboardSignals against demo leads produces non-zero, colorful counts", async () => {
    const { demoCrmLeads } = await import("../demo/demoDashboardSignals");
    const { computeCrmDashboardSignals } = await import("../services/dashboard/crmDashboardSignals");

    const signals = computeCrmDashboardSignals(demoCrmLeads);

    expect(signals.openLeadsCount).toBeGreaterThan(0);
    expect(signals.followUpsDueCount).toBeGreaterThan(0);
    expect(signals.stalledCount).toBeGreaterThan(0);
  });

  it("computeFinancialDashboardSignals against demo items produces non-zero, colorful counts", async () => {
    const { demoFinancialWatchItems } = await import("../demo/demoDashboardSignals");
    const { computeFinancialDashboardSignals } = await import("../services/dashboard/financialDashboardSignals");

    const signals = computeFinancialDashboardSignals(demoFinancialWatchItems);

    expect(signals.budgetThresholdsCount).toBeGreaterThan(0);
    expect(signals.budgetOvershootCount).toBeGreaterThan(0);
    expect(signals.accountsActionablesCount).toBeGreaterThan(0);
    expect(signals.accountsActionablesOverdueCount).toBeGreaterThan(0);
  });
});
