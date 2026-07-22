import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getLiveWorkspaceMetricsMock = vi.fn();

vi.mock("../services/live-platform/livePlatform", () => ({
  getLiveWorkspaceMetrics: (...args: unknown[]) => getLiveWorkspaceMetricsMock(...args),
}));

describe("liveWorkspaceMetricsCache (Sprint 5, F-021 -- Dashboard duplicate request cleanup)", () => {
  beforeEach(() => {
    vi.resetModules();
    getLiveWorkspaceMetricsMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const scopeA = { organizationId: "org_a", userId: "user_a", role: "Organization Admin" } as never;
  const scopeB = { organizationId: "org_b", userId: "user_b", role: "Organization Admin" } as never;
  const services = {} as never;

  it("collapses concurrent calls for the same tenant scope into a single underlying request (the exact Dashboard 3x-per-load duplication this closes)", async () => {
    const { getSharedLiveWorkspaceMetrics } = await import("./liveWorkspaceMetricsCache");
    getLiveWorkspaceMetricsMock.mockResolvedValue({ activeProjects: 1 });

    const [a, b, c] = await Promise.all([
      getSharedLiveWorkspaceMetrics(services, scopeA),
      getSharedLiveWorkspaceMetrics(services, scopeA),
      getSharedLiveWorkspaceMetrics(services, scopeA),
    ]);

    expect(getLiveWorkspaceMetricsMock).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("issues an independent request per distinct tenant scope, never sharing data across organizations/users", async () => {
    const { getSharedLiveWorkspaceMetrics } = await import("./liveWorkspaceMetricsCache");
    getLiveWorkspaceMetricsMock.mockImplementation((_services, scope) => Promise.resolve({ activeProjects: scope.organizationId === "org_a" ? 1 : 2 }));

    const [resultA, resultB] = await Promise.all([
      getSharedLiveWorkspaceMetrics(services, scopeA),
      getSharedLiveWorkspaceMetrics(services, scopeB),
    ]);

    expect(getLiveWorkspaceMetricsMock).toHaveBeenCalledTimes(2);
    expect(resultA.activeProjects).toBe(1);
    expect(resultB.activeProjects).toBe(2);
  });

  it("does not cache a rejected request -- a failed fetch never poisons subsequent calls for the TTL window", async () => {
    const { getSharedLiveWorkspaceMetrics } = await import("./liveWorkspaceMetricsCache");
    getLiveWorkspaceMetricsMock.mockRejectedValueOnce(new Error("network error"));
    getLiveWorkspaceMetricsMock.mockResolvedValueOnce({ activeProjects: 5 });

    await expect(getSharedLiveWorkspaceMetrics(services, scopeA)).rejects.toThrow("network error");
    const result = await getSharedLiveWorkspaceMetrics(services, scopeA);

    expect(getLiveWorkspaceMetricsMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ activeProjects: 5 });
  });

  it("clears every cached tenant entry so a logout followed by a different user's login never reuses a stale value", async () => {
    const { getSharedLiveWorkspaceMetrics, clearLiveWorkspaceMetricsCache } = await import("./liveWorkspaceMetricsCache");
    getLiveWorkspaceMetricsMock.mockResolvedValue({ activeProjects: 1 });

    await getSharedLiveWorkspaceMetrics(services, scopeA);
    clearLiveWorkspaceMetricsCache();
    await getSharedLiveWorkspaceMetrics(services, scopeA);

    expect(getLiveWorkspaceMetricsMock).toHaveBeenCalledTimes(2);
  });
});
