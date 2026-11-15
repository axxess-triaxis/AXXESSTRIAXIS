import { afterEach, describe, expect, it, vi } from "vitest";
import { isSupabaseAdminConfigured, supabaseAdminRest } from "./supabaseAdmin";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

describe("Supabase admin config resolution (A-67)", () => {
  it("is not configured when neither key is present", () => {
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    expect(isSupabaseAdminConfigured()).toBe(false);
  });

  it("is configured from the legacy SUPABASE_SERVICE_ROLE_KEY alone", () => {
    delete process.env.SUPABASE_SECRET_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "legacy-jwt";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    expect(isSupabaseAdminConfigured()).toBe(true);
  });

  it("prefers SUPABASE_SECRET_KEY over the legacy key when both are present", async () => {
    process.env.SUPABASE_SECRET_KEY = "sb_secret_new";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "legacy-jwt";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

    const fetchMock = vi.fn(async () => new Response("[]", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await supabaseAdminRest("some_table");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.apikey).toBe("sb_secret_new");
    expect(headers.Authorization).toBe("Bearer sb_secret_new");
  });
});

describe("Supabase admin clock-skew retry (PGRST303, 2026-11-15)", () => {
  const SKEW_BODY = '{"code":"PGRST303","details":null,"hint":null,"message":"JWT issued at future"}';

  function configure() {
    process.env.SUPABASE_SECRET_KEY = "sb_secret_new";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries once after a delay when Supabase says the JWT was issued in the future", async () => {
    configure();
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(SKEW_BODY, { status: 401 }))
      .mockResolvedValueOnce(new Response('[{"id":"a"}]', { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const pending = supabaseAdminRest<{ id: string }[]>("outreach_email_events", { method: "POST", body: { id: "a" } });
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);

    await expect(pending).resolves.toEqual([{ id: "a" }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [firstUrl, firstInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const [secondUrl, secondInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(secondUrl).toBe(firstUrl);
    expect(secondInit.method).toBe("POST");
    expect(secondInit.body).toBe(firstInit.body);
  });

  it("throws with the second error when the retry also fails", async () => {
    configure();
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(SKEW_BODY, { status: 401 }))
      .mockResolvedValueOnce(new Response("boom", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    const pending = supabaseAdminRest("outreach_email_events");
    const assertion = expect(pending).rejects.toThrow("Supabase admin request failed for outreach_email_events: 503 boom");
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry any other 401", async () => {
    configure();
    const fetchMock = vi.fn(async () => new Response('{"code":"PGRST301","message":"JWT expired"}', { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(supabaseAdminRest("some_table")).rejects.toThrow("401");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry other failures", async () => {
    configure();
    const fetchMock = vi.fn(async () => new Response("server error", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(supabaseAdminRest("some_table")).rejects.toThrow("500 server error");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
