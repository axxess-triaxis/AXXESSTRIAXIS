import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchSentryProjectHealth } from "./sentryProjectHealth";

const ENV_KEYS = ["SENTRY_AUTH_TOKEN", "SENTRY_ORG", "SENTRY_PROJECT"] as const;

describe("fetchSentryProjectHealth", () => {
  beforeEach(() => {
    ENV_KEYS.forEach((key) => vi.stubEnv(key, ""));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns not-configured, without calling fetch, when any required env var is absent", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await fetchSentryProjectHealth();

    expect(result).toEqual({ status: "not-configured", provider: "none" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns ok with real parsed counts on a successful configured call", async () => {
    vi.stubEnv("SENTRY_AUTH_TOKEN", "token");
    vi.stubEnv("SENTRY_ORG", "triaxis");
    vi.stubEnv("SENTRY_PROJECT", "axxess");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ status: "unresolved" }, { status: "resolved" }, { status: "unresolved" }],
    }));

    const result = await fetchSentryProjectHealth();

    expect(result).toEqual({ status: "ok", provider: "sentry", issuesLast24h: 3, unresolvedIssues: 2 });
  });

  it("returns error, never a fabricated number, when the Sentry request fails", async () => {
    vi.stubEnv("SENTRY_AUTH_TOKEN", "token");
    vi.stubEnv("SENTRY_ORG", "triaxis");
    vi.stubEnv("SENTRY_PROJECT", "axxess");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => "unauthorized" }));

    const result = await fetchSentryProjectHealth();

    expect(result.status).toBe("error");
    expect(result).toMatchObject({ provider: "sentry", error: expect.stringContaining("401") });
  });

  it("returns error when the network call itself throws", async () => {
    vi.stubEnv("SENTRY_AUTH_TOKEN", "token");
    vi.stubEnv("SENTRY_ORG", "triaxis");
    vi.stubEnv("SENTRY_PROJECT", "axxess");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await fetchSentryProjectHealth();

    expect(result).toEqual({ status: "error", provider: "sentry", error: "network down" });
  });
});
