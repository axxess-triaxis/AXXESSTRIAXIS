import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchMixpanelQueryHealth } from "./mixpanelQueryHealth";

describe("fetchMixpanelQueryHealth", () => {
  beforeEach(() => {
    vi.stubEnv("MIXPANEL_SERVICE_ACCOUNT_USERNAME", "");
    vi.stubEnv("MIXPANEL_SERVICE_ACCOUNT_SECRET", "");
    vi.stubEnv("MIXPANEL_PROJECT_ID", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns not-configured, without calling fetch, when env vars are absent", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await fetchMixpanelQueryHealth();

    expect(result).toEqual({ status: "not-configured", provider: "none" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns ok with a real parsed total on a successful configured call", async () => {
    vi.stubEnv("MIXPANEL_SERVICE_ACCOUNT_USERNAME", "svc");
    vi.stubEnv("MIXPANEL_SERVICE_ACCOUNT_SECRET", "secret");
    vi.stubEnv("MIXPANEL_PROJECT_ID", "456");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { values: { "Event A": { "2026-08-15": 5 }, "Event B": { "2026-08-15": 3 } } } }),
    }));

    const result = await fetchMixpanelQueryHealth();

    expect(result).toEqual({ status: "ok", provider: "mixpanel", eventsLast24h: 8 });
  });

  it("returns error, never a fabricated number, when the request fails", async () => {
    vi.stubEnv("MIXPANEL_SERVICE_ACCOUNT_USERNAME", "svc");
    vi.stubEnv("MIXPANEL_SERVICE_ACCOUNT_SECRET", "secret");
    vi.stubEnv("MIXPANEL_PROJECT_ID", "456");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => "unauthorized" }));

    const result = await fetchMixpanelQueryHealth();

    expect(result.status).toBe("error");
  });
});
