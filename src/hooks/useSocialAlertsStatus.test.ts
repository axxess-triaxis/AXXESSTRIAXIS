import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSocialAlertsStatus } from "./useSocialAlertsStatus";

describe("useSocialAlertsStatus (Executive Dashboard Sprint ED-2)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const scope = { organizationId: "org_a", userId: "user_a", role: "Organization Admin" } as never;

  it("reflects the real server-evaluated provider status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: true, providers: [], anyLiveProviderConfigured: true }),
    }));

    const { result } = renderHook(() => useSocialAlertsStatus(scope));

    await waitFor(() => expect(result.current.anyLiveProviderConfigured).toBe(true));
  });

  it("defaults to false (honestly not connected) without a scope, never fetching", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSocialAlertsStatus(undefined));

    expect(result.current.anyLiveProviderConfigured).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
