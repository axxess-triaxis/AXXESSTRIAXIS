import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

// Regression test for audit finding L1 (docs/readiness/STACK_PERSONA_ORCHESTRATION_AUDIT_2026_11_05.md):
// a suspended user could still sign in and every API route treated them as a normal session, because
// public.users.status was never read when the session was resolved.

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

const authUser = { id: "user-1", email: "person@axxess.test", app_metadata: { organization_id: "org-1" } };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function stubSupabase(status: string | undefined, seenUrls: string[] = []) {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    seenUrls.push(url);
    if (url.includes("token?grant_type=")) {
      return jsonResponse({ access_token: "access-1", refresh_token: "refresh-1", expires_in: 3600, user: authUser });
    }
    if (url.includes("/rest/v1/users")) {
      return jsonResponse([{
        id: "user-1",
        organization_id: "org-1",
        email: "person@axxess.test",
        display_name: "Person",
        avatar_initials: "PE",
        role: "Employee",
        ...(status ? { status } : {}),
      }]);
    }
    if (url.includes("/auth/v1/user")) return jsonResponse(authUser);
    return jsonResponse({});
  }));
}

describe("serverSession refuses suspended users", () => {
  beforeEach(() => {
    store = new Map();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads status when it resolves the user", async () => {
    const seen: string[] = [];
    stubSupabase("active", seen);
    const { signInServerSide } = await import("./serverSession");
    await signInServerSide("person@axxess.test", "synthetic-password");
    const usersCall = seen.find((url) => url.includes("/rest/v1/users"));
    expect(usersCall).toMatch(/select=[^&]*\bstatus\b/);
  });

  it("rejects password sign-in with AccountSuspendedError and sets no session cookies", async () => {
    stubSupabase("suspended");
    const { AccountSuspendedError } = await import("./supabaseUser");
    const { signInServerSide, accessTokenCookieName, refreshTokenCookieName, sessionAnchorCookieName } = await import("./serverSession");
    await expect(signInServerSide("person@axxess.test", "synthetic-password")).rejects.toBeInstanceOf(AccountSuspendedError);
    expect(store.has(accessTokenCookieName)).toBe(false);
    expect(store.has(refreshTokenCookieName)).toBe(false);
    expect(store.has(sessionAnchorCookieName)).toBe(false);
  });

  it("ends an existing session once the user is suspended, without rotating the refresh token", async () => {
    const seen: string[] = [];
    stubSupabase("suspended", seen);
    const { getServerAuthSession, accessTokenCookieName, refreshTokenCookieName, sessionAnchorCookieName } = await import("./serverSession");
    store.set(accessTokenCookieName, { value: "access-1", maxAge: 3600 });
    store.set(refreshTokenCookieName, { value: "refresh-1", maxAge: 3600 });
    store.set(sessionAnchorCookieName, { value: String(Date.now()), maxAge: 3600 });

    await expect(getServerAuthSession(true)).resolves.toBeNull();
    expect(store.has(accessTokenCookieName)).toBe(false);
    expect(store.has(refreshTokenCookieName)).toBe(false);
    expect(seen.some((url) => url.includes("token?grant_type=refresh_token"))).toBe(false);
  });

  it("still allows active users, invited users and rows with no status", async () => {
    for (const status of ["active", "invited", undefined]) {
      store = new Map();
      vi.resetModules();
      stubSupabase(status);
      const { signInServerSide } = await import("./serverSession");
      await expect(signInServerSide("person@axxess.test", "synthetic-password")).resolves.toMatchObject({ user: { id: "user-1" } });
    }
  });
});
