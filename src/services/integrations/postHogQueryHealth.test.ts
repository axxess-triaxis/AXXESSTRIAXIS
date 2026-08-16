import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPostHogQueryHealth } from "./postHogQueryHealth";

describe("fetchPostHogQueryHealth", () => {
  beforeEach(() => {
    vi.stubEnv("POSTHOG_PERSONAL_API_KEY", "");
    vi.stubEnv("POSTHOG_PROJECT_ID", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns not-configured, without calling fetch, when env vars are absent", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await fetchPostHogQueryHealth();

    expect(result).toEqual({ status: "not-configured", provider: "none" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns ok with a real parsed count on a successful configured call", async () => {
    vi.stubEnv("POSTHOG_PERSONAL_API_KEY", "key");
    vi.stubEnv("POSTHOG_PROJECT_ID", "123");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ count: 42 }) }));

    const result = await fetchPostHogQueryHealth();

    expect(result).toEqual({ status: "ok", provider: "posthog", eventsLast24h: 42 });
  });

  it("returns error, never a fabricated number, when the request fails", async () => {
    vi.stubEnv("POSTHOG_PERSONAL_API_KEY", "key");
    vi.stubEnv("POSTHOG_PROJECT_ID", "123");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => "forbidden" }));

    const result = await fetchPostHogQueryHealth();

    expect(result.status).toBe("error");
  });
});
