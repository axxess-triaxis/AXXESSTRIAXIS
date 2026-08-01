import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const getSharedLiveWorkspaceMetricsMock = vi.fn();

vi.mock("./liveWorkspaceMetricsCache", () => ({
  getSharedLiveWorkspaceMetrics: (...args: unknown[]) => getSharedLiveWorkspaceMetricsMock(...args),
}));

describe("useLiveWorkspaceMetrics (Executive Dashboard Sprint ED-1 -- Refresh)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const scope = { organizationId: "org_a", userId: "user_a", role: "Organization Admin" } as never;

  it("re-fetches when refreshToken changes, even though scope stays the same", async () => {
    const { useLiveWorkspaceMetrics } = await import("./useLiveWorkspaceMetrics");
    getSharedLiveWorkspaceMetricsMock
      .mockResolvedValueOnce({ activeProjects: 1 })
      .mockResolvedValueOnce({ activeProjects: 2 });

    const { result, rerender } = renderHook(
      ({ refreshToken }: { refreshToken: number }) => useLiveWorkspaceMetrics(scope, refreshToken),
      { initialProps: { refreshToken: 0 } },
    );

    await waitFor(() => expect(getSharedLiveWorkspaceMetricsMock).toHaveBeenCalledTimes(1));

    rerender({ refreshToken: 1 });

    await waitFor(() => expect(getSharedLiveWorkspaceMetricsMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect((result.current as { activeProjects: number }).activeProjects).toBe(2));
  });

  it("does not re-fetch when neither scope nor refreshToken changes", async () => {
    const { useLiveWorkspaceMetrics } = await import("./useLiveWorkspaceMetrics");
    getSharedLiveWorkspaceMetricsMock.mockResolvedValue({ activeProjects: 1 });

    const { rerender } = renderHook(
      ({ refreshToken }: { refreshToken: number }) => useLiveWorkspaceMetrics(scope, refreshToken),
      { initialProps: { refreshToken: 0 } },
    );

    await waitFor(() => expect(getSharedLiveWorkspaceMetricsMock).toHaveBeenCalledTimes(1));

    rerender({ refreshToken: 0 });

    expect(getSharedLiveWorkspaceMetricsMock).toHaveBeenCalledTimes(1);
  });
});
