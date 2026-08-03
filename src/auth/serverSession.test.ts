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

// A-86: a real Supabase access token is a JWT; decodeAccessTokenExpiry only ever reads its payload
// segment, so a minimal 3-part base64url string with an `exp` claim is enough to exercise it without
// a real signature.
function fakeJwt(expiresInSeconds: number) {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  return `header.${payload}.signature`;
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

  // A-86 (2026-08-03): the concurrent-refresh-race regression test above proves losing requests no
  // longer wipe cookies, but it cannot prevent Supabase/GoTrue's own single-use-refresh-token reuse
  // detection from revoking the whole token family when 20 parallel requests redeem the same
  // refresh token at once. The real fix is to stop that redemption from ever happening: proactively
  // renew the access token at the one call site that already gates dashboard mount, before the
  // parallel burst fires.
  describe("proactive refresh (A-86)", () => {
    it("decodeAccessTokenExpiry reads a JWT's exp claim without verifying its signature", async () => {
      const { decodeAccessTokenExpiry } = await import("./serverSession");
      const token = fakeJwt(3600);
      const exp = decodeAccessTokenExpiry(token);
      expect(exp).toBeCloseTo(Math.floor(Date.now() / 1000) + 3600, -1);
    });

    it("decodeAccessTokenExpiry returns null for a malformed token instead of throwing", async () => {
      const { decodeAccessTokenExpiry } = await import("./serverSession");
      expect(decodeAccessTokenExpiry("not-a-jwt")).toBeNull();
      expect(decodeAccessTokenExpiry("")).toBeNull();
      expect(decodeAccessTokenExpiry("header.not-base64url!!.sig")).toBeNull();
    });

    it("proactively refreshes when the access token is within the margin, without ever validating the stale token", async () => {
      const { getServerAuthSession, accessTokenCookieName, refreshTokenCookieName, sessionAnchorCookieName } = await import("./serverSession");

      store.set(accessTokenCookieName, { value: fakeJwt(120), maxAge: 3600 }); // 2 min left, under a 5 min margin
      store.set(refreshTokenCookieName, { value: "refresh-1", maxAge: 60 * 60 * 24 * 30 });
      store.set(sessionAnchorCookieName, { value: String(Date.now()), maxAge: 60 * 60 * 24 });

      const fetchMock = vi.fn(async (url: string) => {
        if (url.endsWith("/auth/v1/user")) throw new Error("must not validate the stale token when a proactive refresh is due");
        if (url.includes("token?grant_type=refresh_token")) {
          return jsonResponse({ access_token: fakeJwt(3600), refresh_token: "refresh-2", user: authUser });
        }
        if (url.includes("/rest/v1/users")) return jsonResponse([]);
        throw new Error(`Unexpected fetch: ${url}`);
      });
      vi.stubGlobal("fetch", fetchMock);

      const session = await getServerAuthSession(true, { refreshIfExpiringWithinSeconds: 300 });

      expect(session?.refreshToken).toBe("refresh-2");
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes("grant_type=refresh_token"))).toBe(true);
    });

    it("falls through to validating the original access token when the proactive refresh itself fails (best-effort, non-fatal)", async () => {
      const { getServerAuthSession, accessTokenCookieName, refreshTokenCookieName, sessionAnchorCookieName } = await import("./serverSession");

      const staleAccess = fakeJwt(120);
      store.set(accessTokenCookieName, { value: staleAccess, maxAge: 3600 });
      store.set(refreshTokenCookieName, { value: "refresh-1", maxAge: 60 * 60 * 24 * 30 });
      store.set(sessionAnchorCookieName, { value: String(Date.now()), maxAge: 60 * 60 * 24 });

      vi.stubGlobal("fetch", vi.fn(async (url: string) => {
        if (url.includes("token?grant_type=refresh_token")) return jsonResponse({ error_code: "network_error" }, 500);
        if (url.endsWith("/auth/v1/user")) return jsonResponse(authUser);
        if (url.includes("/rest/v1/users")) return jsonResponse([]);
        throw new Error(`Unexpected fetch: ${url}`);
      }));

      const session = await getServerAuthSession(true, { refreshIfExpiringWithinSeconds: 300 });

      expect(session?.accessToken).toBe(staleAccess);
      expect(session?.user.email).toBe("founder@axxess.dev");
    });

    it("does not attempt a proactive refresh when no options are passed -- every other of the ~84 call sites is unaffected", async () => {
      const { getServerAuthSession, accessTokenCookieName, refreshTokenCookieName, sessionAnchorCookieName } = await import("./serverSession");

      store.set(accessTokenCookieName, { value: fakeJwt(120), maxAge: 3600 }); // would trigger a proactive refresh if options were passed
      store.set(refreshTokenCookieName, { value: "refresh-1", maxAge: 60 * 60 * 24 * 30 });
      store.set(sessionAnchorCookieName, { value: String(Date.now()), maxAge: 60 * 60 * 24 });

      const fetchMock = vi.fn(async (url: string) => {
        if (url.includes("token?grant_type=refresh_token")) throw new Error("must not proactively refresh without options");
        if (url.endsWith("/auth/v1/user")) return jsonResponse(authUser);
        if (url.includes("/rest/v1/users")) return jsonResponse([]);
        throw new Error(`Unexpected fetch: ${url}`);
      });
      vi.stubGlobal("fetch", fetchMock);

      const session = await getServerAuthSession(true);

      expect(session?.user.email).toBe("founder@axxess.dev");
    });

    it("logs the real Supabase error code when a losing concurrent refresh attempt fails, instead of discarding it silently", async () => {
      const { getServerAuthSession, accessTokenCookieName, refreshTokenCookieName, sessionAnchorCookieName } = await import("./serverSession");

      store.set(accessTokenCookieName, { value: "stale-access", maxAge: 3600 });
      store.set(refreshTokenCookieName, { value: "already-rotated-refresh", maxAge: 60 * 60 * 24 * 30 });
      store.set(sessionAnchorCookieName, { value: String(Date.now()), maxAge: 60 * 60 * 24 });

      vi.stubGlobal("fetch", vi.fn(async (url: string) => {
        if (url.endsWith("/auth/v1/user")) return jsonResponse({ error: "invalid token" }, 401);
        if (url.includes("token?grant_type=refresh_token")) return jsonResponse({ error_code: "refresh_token_already_used" }, 400);
        throw new Error(`Unexpected fetch: ${url}`);
      }));
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

      const session = await getServerAuthSession(true);

      expect(session).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("concurrent refresh"), "refresh_token_already_used");
      // Still leaves cookies untouched -- this is additive observability, not a behavior change.
      expect(store.get(accessTokenCookieName)?.value).toBe("stale-access");
      warnSpy.mockRestore();
    });

    it("derives the access-token cookie's maxAge from the JWT's own exp claim rather than trusting expires_in blindly", async () => {
      vi.stubGlobal("fetch", vi.fn(async (url: string) => {
        if (url.includes("token?grant_type=password")) {
          // expires_in claims 3600s, but the JWT's real exp says only 120s remain -- the cookie
          // must reflect the real, shorter lifetime, not the stale reported value.
          return jsonResponse({ access_token: fakeJwt(120), refresh_token: "refresh-1", expires_in: 3600, user: authUser });
        }
        if (url.includes("/rest/v1/users")) return jsonResponse([]);
        throw new Error(`Unexpected fetch: ${url}`);
      }));

      const { signInServerSide, accessTokenCookieName } = await import("./serverSession");
      await signInServerSide("founder@axxess.dev", "hunter2");

      const maxAge = store.get(accessTokenCookieName)?.maxAge ?? 0;
      expect(maxAge).toBeLessThan(200);
      expect(maxAge).toBeGreaterThan(60);
    });
  });

  // A-84 (2026-08-02): authenticated phone-linking -- attaches a phone number to an ALREADY
  // signed-in user's EXISTING identity (updateUser + verifyOtp type:"phone_change"), distinct
  // from verifyPhoneOtpServerSide's unauthenticated *sign-in* OTP flow, which is the root cause
  // of the tenant-identity-linking bug this fixes.
  describe("linkPhoneStartServerSide / linkPhoneVerifyServerSide", () => {
    it("calls PUT /auth/v1/user with the phone number, authenticated with the caller's own access token", async () => {
      const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        if (url.endsWith("/auth/v1/user") && init?.method === "PUT") {
          expect((init.headers as Record<string, string>).Authorization).toBe("Bearer access-1");
          expect(JSON.parse(String(init.body))).toEqual({ phone: "+911234567890" });
          return jsonResponse({});
        }
        throw new Error(`Unexpected fetch: ${url}`);
      });
      vi.stubGlobal("fetch", fetchMock);

      const { linkPhoneStartServerSide } = await import("./serverSession");
      await linkPhoneStartServerSide("access-1", "+911234567890");
      expect(fetchMock).toHaveBeenCalledOnce();
    });

    it("verifies with type:'phone_change' (not 'sms') and resolves the SAME existing user, since Supabase attaches the phone to the caller's existing auth.users row rather than creating a new one", async () => {
      const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        if (url.endsWith("/auth/v1/verify")) {
          expect(JSON.parse(String(init?.body))).toEqual({ type: "phone_change", phone: "+911234567890", token: "123456" });
          return jsonResponse({ access_token: "access-1", refresh_token: "refresh-1", user: { ...authUser, phone: "+911234567890" } });
        }
        if (url.includes("/rest/v1/users")) {
          return jsonResponse([{ id: "user-1", organization_id: "org-1", email: "founder@axxess.dev", display_name: "Founder", avatar_initials: "FO", role: "Organization Admin" }]);
        }
        throw new Error(`Unexpected fetch: ${url}`);
      });
      vi.stubGlobal("fetch", fetchMock);

      const { linkPhoneVerifyServerSide } = await import("./serverSession");
      const user = await linkPhoneVerifyServerSide("access-1", "+911234567890", "123456");

      expect(user.id).toBe("user-1");
      expect(user.organizationId).toBe("org-1");
      expect(user.needsOnboarding).toBeUndefined();
    });

    it("surfaces Supabase's real 'phone already belongs to another user' error rather than swallowing it", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error_code: "phone_exists", msg: "A user with this phone number already exists" }, 422)));

      const { linkPhoneVerifyServerSide } = await import("./serverSession");
      await expect(linkPhoneVerifyServerSide("access-1", "+911234567890", "123456")).rejects.toThrow("A user with this phone number already exists");
    });
  });
});
