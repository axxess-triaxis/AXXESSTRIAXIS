import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchProductHuntLaunchHealth } from "./productHuntLaunchTracker";

const TOKEN = "test-token-not-real";

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return { ok: init.ok ?? true, status: init.status ?? 200, json: async () => body };
}

describe("fetchProductHuntLaunchHealth", () => {
  beforeEach(() => {
    vi.stubEnv("PRODUCT_HUNT_DEVELOPER_TOKEN", "");
    vi.stubEnv("PRODUCT_HUNT_POST_SLUG", "");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns not-configured, without calling fetch, when the token is absent", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(fetchProductHuntLaunchHealth()).resolves.toEqual({ status: "not-configured", provider: "none" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns the real counts from a successful call", async () => {
    vi.stubEnv("PRODUCT_HUNT_DEVELOPER_TOKEN", TOKEN);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      data: { post: { name: "AXXESS TRIaxis", votesCount: 42, commentsCount: 7, reviewsRating: 4.5, featuredAt: "2026-10-01T07:00:00Z" } },
    })));

    await expect(fetchProductHuntLaunchHealth()).resolves.toEqual({
      status: "ok",
      provider: "product-hunt",
      post: "AXXESS TRIaxis",
      votes: 42,
      comments: 7,
      reviewsRating: 4.5,
      featuredOn: "2026-10-01",
    });
  });

  it("says when a post is not featured rather than inventing a date", async () => {
    vi.stubEnv("PRODUCT_HUNT_DEVELOPER_TOKEN", TOKEN);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      data: { post: { name: "AXXESS TRIaxis", votesCount: 0, commentsCount: 0, reviewsRating: 0, featuredAt: null } },
    })));

    await expect(fetchProductHuntLaunchHealth()).resolves.toMatchObject({ status: "ok", votes: 0, featuredOn: "not featured" });
  });

  it("sends the token as a bearer header to the GraphQL endpoint, with the default slug", async () => {
    vi.stubEnv("PRODUCT_HUNT_DEVELOPER_TOKEN", TOKEN);
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ data: { post: null } }));
    vi.stubGlobal("fetch", fetchSpy);

    await fetchProductHuntLaunchHealth();

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.producthunt.com/v2/api/graphql");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
    expect(JSON.parse(String(init.body)).variables).toEqual({ slug: "axxess-triaxis" });
  });

  it("uses PRODUCT_HUNT_POST_SLUG when it is set", async () => {
    vi.stubEnv("PRODUCT_HUNT_DEVELOPER_TOKEN", TOKEN);
    vi.stubEnv("PRODUCT_HUNT_POST_SLUG", "another-post");
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ data: { post: null } }));
    vi.stubGlobal("fetch", fetchSpy);

    await fetchProductHuntLaunchHealth();

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body)).variables).toEqual({ slug: "another-post" });
  });

  it("reports an error, with no made-up numbers, when the slug matches no post", async () => {
    vi.stubEnv("PRODUCT_HUNT_DEVELOPER_TOKEN", TOKEN);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: { post: null } })));

    await expect(fetchProductHuntLaunchHealth()).resolves.toEqual({
      status: "error",
      provider: "product-hunt",
      error: 'No Product Hunt post found for slug "axxess-triaxis"',
    });
  });

  it("reports an error on a failed HTTP status", async () => {
    vi.stubEnv("PRODUCT_HUNT_DEVELOPER_TOKEN", TOKEN);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, { ok: false, status: 401 })));

    await expect(fetchProductHuntLaunchHealth()).resolves.toEqual({
      status: "error",
      provider: "product-hunt",
      error: "Product Hunt request failed with 401",
    });
  });

  it("treats GraphQL errors on a 200 response as an error", async () => {
    vi.stubEnv("PRODUCT_HUNT_DEVELOPER_TOKEN", TOKEN);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ errors: [{ message: "rate limit reached" }] })));

    await expect(fetchProductHuntLaunchHealth()).resolves.toEqual({
      status: "error",
      provider: "product-hunt",
      error: "Product Hunt returned an error: rate limit reached",
    });
  });

  it("returns an error instead of throwing on a network failure, and never exposes the token", async () => {
    vi.stubEnv("PRODUCT_HUNT_DEVELOPER_TOKEN", TOKEN);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await fetchProductHuntLaunchHealth();

    expect(result).toEqual({ status: "error", provider: "product-hunt", error: "network down" });
    expect(JSON.stringify(result)).not.toContain(TOKEN);
    expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain(TOKEN);
  });
});
