import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  rules: [] as Array<{ id: string; organizationId: string; provider: string; keyword: string; topic: string; urgency: string; createdAt: string }>,
  upsertCalls: [] as unknown[],
  upsertShouldFail: false,
};

vi.mock("../../repositories/socialAlertRulesRepository", () => ({
  listSocialAlertRulesForProvider: async () => state.rules,
}));

vi.mock("../../repositories/socialAlertEventsRepository", () => ({
  upsertSocialAlertEvent: async (input: unknown) => {
    state.upsertCalls.push(input);
    if (state.upsertShouldFail) throw new Error("upsert failed");
    return { id: "event-1" };
  },
}));

import { fetchBrand24Mentions, syncBrand24Mentions } from "./brand24Ingestion";

function rule(overrides: Partial<(typeof state.rules)[number]> = {}) {
  return {
    id: "rule-1", organizationId: "org-1", provider: "brand24", keyword: "oxygen",
    topic: "healthcare funding", urgency: "high", createdAt: "2026-08-17T00:00:00.000Z",
    ...overrides,
  };
}

describe("fetchBrand24Mentions / syncBrand24Mentions", () => {
  const ENV_KEYS = ["BRAND24_API_KEY", "BRAND24_PROJECT_ID"] as const;

  beforeEach(() => {
    ENV_KEYS.forEach((key) => vi.stubEnv(key, ""));
    state.rules = [];
    state.upsertCalls = [];
    state.upsertShouldFail = false;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns not-configured, without calling fetch, when Brand24 env vars are absent", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await syncBrand24Mentions();

    expect(result).toEqual({ status: "not-configured" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fetchBrand24Mentions maps real mentions defensively, tolerating missing fields", async () => {
    vi.stubEnv("BRAND24_API_KEY", "key");
    vi.stubEnv("BRAND24_PROJECT_ID", "123");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { id: 1, title: "District hospital reports oxygen shortage", author: "@localnews", sentiment: "negative", date: "2026-08-17T08:00:00.000Z" },
          { id: 2, description: "No title here, only a description field this time." },
        ],
      }),
    }));

    const mentions = await fetchBrand24Mentions();

    expect(mentions).toHaveLength(2);
    expect(mentions[0]).toMatchObject({ provider: "brand24", externalId: "1", title: "District hospital reports oxygen shortage", sentiment: "negative" });
    expect(mentions[1].title).toContain("No title here");
    expect(mentions[1].sentiment).toBe("neutral");
  });

  it("syncBrand24Mentions matches mentions against real rules and upserts one event per match, returning real counts", async () => {
    vi.stubEnv("BRAND24_API_KEY", "key");
    vi.stubEnv("BRAND24_PROJECT_ID", "123");
    state.rules = [rule()];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ id: 1, title: "District hospital reports oxygen shortage", sentiment: "negative", date: "2026-08-17T08:00:00.000Z" }] }),
    }));

    const result = await syncBrand24Mentions();

    expect(result).toEqual({ status: "ok", mentionsFetched: 1, eventsCreated: 1, organizationsMatched: 1 });
    expect(state.upsertCalls).toHaveLength(1);
  });

  it("returns error, never a fabricated count, when the Brand24 request fails", async () => {
    vi.stubEnv("BRAND24_API_KEY", "key");
    vi.stubEnv("BRAND24_PROJECT_ID", "123");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }));

    const result = await syncBrand24Mentions();

    expect(result.status).toBe("error");
  });

  it("returns error when the network call itself throws", async () => {
    vi.stubEnv("BRAND24_API_KEY", "key");
    vi.stubEnv("BRAND24_PROJECT_ID", "123");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await syncBrand24Mentions();

    expect(result).toEqual({ status: "error", error: "network down" });
  });

  it("a single organization's upsert failure does not abort the rest of the sync run", async () => {
    vi.stubEnv("BRAND24_API_KEY", "key");
    vi.stubEnv("BRAND24_PROJECT_ID", "123");
    state.rules = [rule({ id: "rule-a", organizationId: "org-a" }), rule({ id: "rule-b", organizationId: "org-b" })];
    state.upsertShouldFail = true;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ id: 1, title: "District hospital reports oxygen shortage", sentiment: "negative", date: "2026-08-17T08:00:00.000Z" }] }),
    }));

    const result = await syncBrand24Mentions();

    expect(result).toEqual({ status: "ok", mentionsFetched: 1, eventsCreated: 0, organizationsMatched: 0 });
  });
});
