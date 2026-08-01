import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type FakeCookieStore = Map<string, { value: string; maxAge: number }>;

let store: FakeCookieStore;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => store.get(name),
    set: (name: string, value: string, options: { maxAge: number }) => {
      if (value === "" || options.maxAge <= 0) {
        store.delete(name);
        return;
      }
      store.set(name, { value, maxAge: options.maxAge });
    },
  }),
}));

const authUser = { id: "user-1", email: "founder@axxess.dev", app_metadata: { organization_id: "org-1", role: "Organization Admin" } };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("serverSession absolute session cap", () => {
  beforeEach(() => {
    store = new Map();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sets an anchor cookie on a fresh password sign-in", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("token?grant_type=password")) {
        return jsonResponse({ access_token: "access-1", refresh_token: "refresh-1", expires_in: 3600, user: authUser });
      }
      if (url.includes("/rest/v1/users")) return jsonResponse([]);
      throw new Error(`Unexpected fetch: ${url}`);
    }));

    const { signInServerSide, sessionAnchorCookieName, accessTokenCookieName } = await import("./serverSession");
    await signInServerSide("founder@axxess.dev", "hunter2");

    expect(store.has(sessionAnchorCookieName)).toBe(true);
    expect(store.get(accessTokenCookieName)?.value).toBe("access-1");
  });

  it("treats a session with access/refresh tokens but no anchor cookie as expired (pre-existing sessions at deploy time)", async () => {
    const { getServerAuthSession, accessTokenCookieName, refreshTokenCookieName, sessionAnchorCookieName } = await import("./serverSession");

    store.set(accessTokenCookieName, { value: "stale-access", maxAge: 3600 });
    store.set(refreshTokenCookieName, { value: "stale-refresh", maxAge: 60 * 60 * 24 * 30 });
    // Deliberately no anchor cookie set -- simulates a session established before this cap existed.

    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("must not call Supabase when the anchor cookie is missing");
    }));

    const session = await getServerAuthSession(true);

    expect(session).toBeNull();
    expect(store.has(accessTokenCookieName)).toBe(false);
    expect(store.has(refreshTokenCookieName)).toBe(false);
    expect(store.has(sessionAnchorCookieName)).toBe(false);
  });

  it("validates normally when access token and anchor cookie are both present", async () => {
    const { getServerAuthSession, accessTokenCookieName, sessionAnchorCookieName } = await import("./serverSession");

    store.set(accessTokenCookieName, { value: "access-1", maxAge: 3600 });
    store.set(sessionAnchorCookieName, { value: String(Date.now()), maxAge: 60 * 60 * 24 });

    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.endsWith("/auth/v1/user")) return jsonResponse(authUser);
      if (url.includes("/rest/v1/users")) return jsonResponse([]);
      throw new Error(`Unexpected fetch: ${url}`);
    }));

    const session = await getServerAuthSession(true);

    expect(session?.accessToken).toBe("access-1");
    expect(session?.user.email).toBe("founder@axxess.dev");
  });

  it("does not renew the anchor cookie on a token refresh", async () => {
    const { getServerAuthSession, accessTokenCookieName, refreshTokenCookieName, sessionAnchorCookieName } = await import("./serverSession");

    const originalAnchor = String(Date.now() - 1000);
    store.set(refreshTokenCookieName, { value: "refresh-1", maxAge: 60 * 60 * 24 * 30 });
    store.set(sessionAnchorCookieName, { value: originalAnchor, maxAge: 60 * 60 * 24 });
    // No access token -- forces the refresh path.

    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("token?grant_type=refresh_token")) {
        return jsonResponse({ access_token: "access-2", refresh_token: "refresh-2", expires_in: 3600, user: authUser });
      }
      if (url.includes("/rest/v1/users")) return jsonResponse([]);
      throw new Error(`Unexpected fetch: ${url}`);
    }));

    const session = await getServerAuthSession(true);

    expect(session?.accessToken).toBe("access-2");
    expect(store.get(accessTokenCookieName)?.value).toBe("access-2");
    // The anchor's value is untouched by refresh -- only a fresh sign-in re-establishes it.
    expect(store.get(sessionAnchorCookieName)?.value).toBe(originalAnchor);
  });

  it("clears cookies when neither an access nor a refresh token is present", async () => {
    const { getServerAuthSession } = await import("./serverSession");
    const session = await getServerAuthSession(true);
    expect(session).toBeNull();
  });

  // 2026-08-01 incident regression test: a burst of concurrent requests (a page's own parallel
  // data-fetch calls) can race on a single-use Supabase refresh token -- one wins and rotates it,
  // the others' refresh attempts fail with an already-invalidated token. The losing request must
  // report itself as unauthenticated without destroying cookies a concurrent winner may have just
  // legitimately set.
  it("does not clear cookies when validation fails and the refresh attempt also fails (concurrent refresh-token race)", async () => {
    const { getServerAuthSession, accessTokenCookieName, refreshTokenCookieName, sessionAnchorCookieName } = await import("./serverSession");

    store.set(accessTokenCookieName, { value: "stale-access", maxAge: 3600 });
    store.set(refreshTokenCookieName, { value: "already-rotated-refresh", maxAge: 60 * 60 * 24 * 30 });
    store.set(sessionAnchorCookieName, { value: String(Date.now()), maxAge: 60 * 60 * 24 });

    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.endsWith("/auth/v1/user")) return jsonResponse({ error: "invalid token" }, 401);
      if (url.includes("token?grant_type=refresh_token")) return jsonResponse({ error_code: "refresh_token_already_used" }, 400);
      throw new Error(`Unexpected fetch: ${url}`);
    }));

    const session = await getServerAuthSession(true);

    expect(session).toBeNull();
    // Cookies survive this request's own failure -- a concurrent sibling request may have already
    // refreshed them successfully, and this request must not wipe that out.
    expect(store.get(accessTokenCookieName)?.value).toBe("stale-access");
    expect(store.get(refreshTokenCookieName)?.value).toBe("already-rotated-refresh");
    expect(store.get(sessionAnchorCookieName)?.value).toBeDefined();
  });
});
