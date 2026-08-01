// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

function requestWith(provider: string) {
  return new Request(`http://localhost/api/auth/oauth/start?provider=${encodeURIComponent(provider)}`);
}

describe("GET /api/auth/oauth/start", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 400 for an unrecognized provider", async () => {
    const response = await GET(requestWith("facebook"));
    expect(response.status).toBe(400);
  });

  it("returns 400 when the provider's feature flag is not enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_MICROSOFT_ENABLED", "false");
    const response = await GET(requestWith("microsoft"));
    expect(response.status).toBe(400);
  });

  it("returns 503 when Supabase Auth isn't configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_GOOGLE_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const response = await GET(requestWith("google"));
    expect(response.status).toBe(503);
  });

  it("uses Supabase's real provider id 'azure' for microsoft, not the app-facing 'microsoft' name", async () => {
    // Real bug, live-confirmed 2026-07-31: Supabase Auth rejected ?provider=microsoft with
    // {"error_code":"validation_failed","msg":"Unsupported provider: Provider microsoft could not
    // be found"} -- Supabase's own identifier for Microsoft/Entra is "azure".
    vi.stubEnv("NEXT_PUBLIC_AUTH_MICROSOFT_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://landing.triaxisventures.com");

    const response = await GET(requestWith("microsoft"));
    const body = await response.json() as { ok: boolean; provider: string; authorizeUrl: string };

    expect(response.status).toBe(200);
    expect(body.provider).toBe("microsoft");
    expect(body.authorizeUrl).toContain("provider=azure");
    expect(body.authorizeUrl).not.toContain("provider=microsoft");
  });

  it("passes google straight through, since Supabase's own id for it already matches", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_GOOGLE_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://landing.triaxisventures.com");

    const response = await GET(requestWith("google"));
    const body = await response.json() as { authorizeUrl: string };

    expect(response.status).toBe(200);
    expect(body.authorizeUrl).toContain("provider=google");
  });
});
