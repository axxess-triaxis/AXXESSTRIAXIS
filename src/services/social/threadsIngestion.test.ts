import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  resolved: undefined as { connectionId: string; organizationId: string; accessToken: string } | undefined,
  upserts: [] as Array<Record<string, unknown>>,
};

vi.mock("./socialConnectionToken", () => ({
  resolveSocialConnectionToken: async () => state.resolved,
}));

vi.mock("../../repositories/publishedContentRepository", () => ({
  upsertPublishedContentItem: async (input: Record<string, unknown>) => {
    state.upserts.push(input);
    return { id: `content-${state.upserts.length}`, ...input };
  },
}));

import { fetchThreadsPosts, syncThreadsContent } from "./threadsIngestion";

describe("fetchThreadsPosts", () => {
  it("rejects a missing access token before making any request", async () => {
    await expect(fetchThreadsPosts("")).rejects.toThrow("Threads access token is required.");
  });

  it("parses real Threads API post data", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: "178001", text: "Hello Threads", media_type: "TEXT_POST", timestamp: "2026-08-02T00:00:00.000Z" }] }),
    });
    const posts = await fetchThreadsPosts("token-123", 25, fetcher as unknown as typeof fetch);
    expect(posts).toEqual([{ id: "178001", text: "Hello Threads", media_type: "TEXT_POST", timestamp: "2026-08-02T00:00:00.000Z" }]);
    const requestUrl = (fetcher.mock.calls[0][0] as URL).toString();
    expect(requestUrl).toContain("graph.threads.net/v1.0/me/threads");
  });

  it("throws the real API error message on failure, not a generic one", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: { message: "Invalid OAuth access token." } }) });
    await expect(fetchThreadsPosts("bad-token", 25, fetcher as unknown as typeof fetch)).rejects.toThrow("Invalid OAuth access token.");
  });
});

describe("syncThreadsContent", () => {
  afterEach(() => {
    state.resolved = undefined;
    state.upserts = [];
    vi.clearAllMocks();
  });

  it("returns undefined (not a guess) when the tenant has no connected Threads account", async () => {
    state.resolved = undefined;
    const result = await syncThreadsContent("org-1");
    expect(result).toBeUndefined();
  });

  it("upserts each fetched post scoped to the resolved tenant connection", async () => {
    state.resolved = { connectionId: "conn-1", organizationId: "org-1", accessToken: "token-123" };
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: "178001", text: "Hello Threads", timestamp: "2026-08-02T00:00:00.000Z" }] }),
    });
    const result = await syncThreadsContent("org-1", undefined, fetcher as unknown as typeof fetch);
    expect(result).toEqual({ synced: 1, skipped: 0 });
    expect(state.upserts[0]).toMatchObject({ organizationId: "org-1", connectionId: "conn-1", providerId: "threads", externalPostId: "178001" });
  });

  it("skips posts with no id rather than upserting a garbage row", async () => {
    state.resolved = { connectionId: "conn-1", organizationId: "org-1", accessToken: "token-123" };
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [{ text: "no id here" }] }) });
    const result = await syncThreadsContent("org-1", undefined, fetcher as unknown as typeof fetch);
    expect(result).toEqual({ synced: 0, skipped: 1 });
    expect(state.upserts.length).toBe(0);
  });
});
