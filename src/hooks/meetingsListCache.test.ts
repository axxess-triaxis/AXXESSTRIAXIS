import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("meetingsListCache (A-20 -- dashboard duplicate meetings-fetch cleanup)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const scopeA = { organizationId: "org_a", userId: "user_a", role: "Organization Admin" } as never;
  const scopeB = { organizationId: "org_b", userId: "user_b", role: "Organization Admin" } as never;

  function stubFetch(impl: (...args: unknown[]) => Promise<unknown>) {
    const fetchMock = vi.fn(impl);
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("collapses concurrent calls for the same tenant scope into a single underlying fetch", async () => {
    const fetchMock = stubFetch(async () => ({ ok: true, json: async () => [{ id: "meeting-1" }] }));
    const { getSharedMeetingsList } = await import("./meetingsListCache");

    const [a, b, c] = await Promise.all([
      getSharedMeetingsList(scopeA),
      getSharedMeetingsList(scopeA),
      getSharedMeetingsList(scopeA),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/repositories/meetings?pageSize=500", expect.objectContaining({ credentials: "include" }));
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("issues an independent request per distinct tenant scope", async () => {
    const fetchMock = stubFetch(async () => ({ ok: true, json: async () => [{ id: "meeting-1" }] }));
    const { getSharedMeetingsList } = await import("./meetingsListCache");

    await Promise.all([getSharedMeetingsList(scopeA), getSharedMeetingsList(scopeB)]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not cache a rejected request -- a failed fetch never poisons subsequent calls for the TTL window", async () => {
    let call = 0;
    const fetchMock = stubFetch(async () => {
      call += 1;
      if (call === 1) return { ok: false, status: 500 };
      return { ok: true, json: async () => [{ id: "meeting-1" }] };
    });
    const { getSharedMeetingsList } = await import("./meetingsListCache");

    await expect(getSharedMeetingsList(scopeA)).rejects.toThrow(/meetings fetch failed/);
    const result = await getSharedMeetingsList(scopeA);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual([{ id: "meeting-1" }]);
  });

  it("invalidateMeetingsListCache drops only the targeted scope, leaving other scopes cached", async () => {
    const fetchMock = stubFetch(async () => ({ ok: true, json: async () => [{ id: "meeting-1" }] }));
    const { getSharedMeetingsList, invalidateMeetingsListCache } = await import("./meetingsListCache");

    await getSharedMeetingsList(scopeA);
    await getSharedMeetingsList(scopeB);
    invalidateMeetingsListCache(scopeA);
    await getSharedMeetingsList(scopeA);
    await getSharedMeetingsList(scopeB);

    // scopeA fetched twice (initial + post-invalidation refetch), scopeB fetched once (still cached).
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
