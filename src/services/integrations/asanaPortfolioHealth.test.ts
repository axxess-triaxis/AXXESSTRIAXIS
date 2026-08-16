import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAsanaPortfolioHealth } from "./asanaPortfolioHealth";

describe("fetchAsanaPortfolioHealth", () => {
  beforeEach(() => {
    vi.stubEnv("ASANA_ACCESS_TOKEN", "");
    vi.stubEnv("ASANA_WORKSPACE_GID", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns not-configured, without calling fetch, when env vars are absent", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await fetchAsanaPortfolioHealth();

    expect(result).toEqual({ status: "not-configured", provider: "none" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns ok with a real parsed count on a successful configured call", async () => {
    vi.stubEnv("ASANA_ACCESS_TOKEN", "token");
    vi.stubEnv("ASANA_WORKSPACE_GID", "789");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [{ gid: "1" }, { gid: "2" }] }) }));

    const result = await fetchAsanaPortfolioHealth();

    expect(result).toEqual({ status: "ok", provider: "asana", incompleteTasks: 2 });
  });

  it("returns error, never a fabricated number, when the request fails", async () => {
    vi.stubEnv("ASANA_ACCESS_TOKEN", "token");
    vi.stubEnv("ASANA_WORKSPACE_GID", "789");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "server error" }));

    const result = await fetchAsanaPortfolioHealth();

    expect(result.status).toBe("error");
  });
});
