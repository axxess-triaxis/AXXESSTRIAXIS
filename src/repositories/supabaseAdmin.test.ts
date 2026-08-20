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
