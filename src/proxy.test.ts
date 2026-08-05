import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getBetaRootRedirectUrl,
  getCanonicalHostRedirectUrl,
  getLiteHostRedirectUrl,
  getMarketingWorkspaceRedirectUrl,
  isAuthShellEnabledFromEnv,
  isDemoModeEnabledFromEnv,
  isLiteAllowedApiPath,
  isProtectedRoutePath,
  proxy,
  resolveDemoModeEnabled,
  shouldBlockLiteApiRequest,
  shouldRedirectToLogin,
} from "./proxy";

describe("route proxy helpers (renamed from middleware.ts in Sprint 5, Next.js 16 middleware-to-proxy migration)", () => {
  it("identifies protected workspace paths", () => {
    expect(isProtectedRoutePath("/dashboard")).toBe(true);
    expect(isProtectedRoutePath("/projects/active")).toBe(true);
    expect(isProtectedRoutePath("/settings")).toBe(true);
    expect(isProtectedRoutePath("/admin/beta-readiness")).toBe(true);
  });

  it("protects /onboarding (Product Issue 2, Sprint 42): the wizard must not be reachable without a session", () => {
    expect(isProtectedRoutePath("/onboarding")).toBe(true);
    expect(isProtectedRoutePath("/onboarding/complete")).toBe(true);
  });

  it("redirects an unauthenticated visit to /onboarding to /auth with a next param pointing back at onboarding", () => {
    expect(shouldRedirectToLogin("/onboarding", {
      authShellEnabled: true,
      demoModeEnabled: false,
      hasSessionCookie: false,
    })).toBe(true);
  });

  it("does not redirect /onboarding once a session cookie is present", () => {
    expect(shouldRedirectToLogin("/onboarding", {
      authShellEnabled: true,
      demoModeEnabled: false,
      hasSessionCookie: true,
    })).toBe(false);
  });

  it("leaves public auth and static paths unprotected", () => {
    expect(isProtectedRoutePath("/auth")).toBe(false);
    expect(isProtectedRoutePath("/")).toBe(false);
  });

  it("redirects apex production host to canonical www host", () => {
    const redirectUrl = getCanonicalHostRedirectUrl(
      new URL("https://triaxisventures.com/dashboard?tab=active"),
      "triaxisventures.com",
    );

    expect(redirectUrl?.toString()).toBe("https://www.triaxisventures.com/dashboard?tab=active");
  });

  it("does not redirect requests already on the canonical host", () => {
    const redirectUrl = getCanonicalHostRedirectUrl(
      new URL("https://www.triaxisventures.com/dashboard"),
      "www.triaxisventures.com",
    );

    expect(redirectUrl).toBeNull();
  });

  it("XLA-21: redirects a non-/lite path on the Lite domain to /lite, closing the X0-route-reachable-on-Lite-domain gap", () => {
    const redirectUrl = getLiteHostRedirectUrl(
      new URL("https://triaxis-product-lite-web.vercel.app/dashboard"),
      "triaxis-product-lite-web.vercel.app",
    );

    expect(redirectUrl?.toString()).toBe("https://triaxis-product-lite-web.vercel.app/lite");
  });

  it("XLA-21: redirects /admin/beta-readiness on the Lite domain too, not just /dashboard", () => {
    const redirectUrl = getLiteHostRedirectUrl(
      new URL("https://triaxis-product-lite-web.vercel.app/admin/beta-readiness"),
      "triaxis-product-lite-web.vercel.app",
    );

    expect(redirectUrl?.toString()).toBe("https://triaxis-product-lite-web.vercel.app/lite");
  });

  it("XLA-21: does not redirect /lite itself or any sub-path on the Lite domain", () => {
    expect(getLiteHostRedirectUrl(new URL("https://triaxis-product-lite-web.vercel.app/lite"), "triaxis-product-lite-web.vercel.app")).toBeNull();
    expect(getLiteHostRedirectUrl(new URL("https://triaxis-product-lite-web.vercel.app/lite/work"), "triaxis-product-lite-web.vercel.app")).toBeNull();
  });

  it("XLA-21: does not redirect /api or /auth on the Lite domain -- Lite reuses the shared auth/session endpoints", () => {
    expect(getLiteHostRedirectUrl(new URL("https://triaxis-product-lite-web.vercel.app/api/auth/session"), "triaxis-product-lite-web.vercel.app")).toBeNull();
    expect(getLiteHostRedirectUrl(new URL("https://triaxis-product-lite-web.vercel.app/auth"), "triaxis-product-lite-web.vercel.app")).toBeNull();
  });

  it("XLA-21: does not touch any other host -- X0's own domains are unaffected", () => {
    expect(getLiteHostRedirectUrl(new URL("https://landing.triaxisventures.com/dashboard"), "landing.triaxisventures.com")).toBeNull();
    expect(getLiteHostRedirectUrl(new URL("https://investor.triaxisventures.com/dashboard"), "investor.triaxisventures.com")).toBeNull();
  });

  it("XLA-21 regression (2026-08-05): protects lite.triaxisventures.com BY DEFAULT, no AXXESS_LITE_HOSTS env var required -- confirmed live that the real custom domain was missing from the original default list, so the marketing/X0 root served unprotected there", () => {
    expect(getLiteHostRedirectUrl(new URL("https://lite.triaxisventures.com/"), "lite.triaxisventures.com")?.toString()).toBe("https://lite.triaxisventures.com/lite");
    expect(getLiteHostRedirectUrl(new URL("https://lite.triaxisventures.com/dashboard"), "lite.triaxisventures.com")?.toString()).toBe("https://lite.triaxisventures.com/lite");
    expect(getLiteHostRedirectUrl(new URL("https://lite.triaxisventures.com/lite"), "lite.triaxisventures.com")).toBeNull();
  });

  describe("getLiteHostRedirectUrl with AXXESS_LITE_HOSTS overridden (e.g. once lite.triaxisventures.com is assigned)", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("honors a custom domain set via AXXESS_LITE_HOSTS instead of the *.vercel.app default", () => {
      vi.stubEnv("AXXESS_LITE_HOSTS", "lite.triaxisventures.com");

      expect(getLiteHostRedirectUrl(new URL("https://lite.triaxisventures.com/dashboard"), "lite.triaxisventures.com")?.toString()).toBe("https://lite.triaxisventures.com/lite");
      // The old default no longer matches once AXXESS_LITE_HOSTS is explicitly set.
      expect(getLiteHostRedirectUrl(new URL("https://triaxis-product-lite-web.vercel.app/dashboard"), "triaxis-product-lite-web.vercel.app")).toBeNull();
    });
  });

  it("redirects beta root host to dashboard", () => {
    const redirectUrl = getBetaRootRedirectUrl(
      new URL("https://beta.triaxisventures.com/"),
      "beta.triaxisventures.com",
    );

    expect(redirectUrl?.toString()).toBe("https://beta.triaxisventures.com/dashboard");
  });

  it("does not redirect non-root beta routes", () => {
    const redirectUrl = getBetaRootRedirectUrl(
      new URL("https://beta.triaxisventures.com/auth"),
      "beta.triaxisventures.com",
    );

    expect(redirectUrl).toBeNull();
  });

  // Reported 2026-07-25: landing.triaxisventures.com's root fell through to the shared marketing
  // chooser page (which links out to the Demo) instead of going straight into the beta workspace,
  // since it was never added alongside beta.triaxisventures.com in this redirect rule.
  it("redirects landing (Product/beta) root host to dashboard", () => {
    const redirectUrl = getBetaRootRedirectUrl(
      new URL("https://landing.triaxisventures.com/"),
      "landing.triaxisventures.com",
    );

    expect(redirectUrl?.toString()).toBe("https://landing.triaxisventures.com/dashboard");
  });

  it("does not redirect LaunchList referral visits on landing root away from the waitlist page (A-85)", () => {
    const redirectUrl = getBetaRootRedirectUrl(
      new URL("https://landing.triaxisventures.com/?ref=WCZaE8"),
      "landing.triaxisventures.com",
    );

    expect(redirectUrl).toBeNull();
  });

  it("does not redirect non-root landing routes", () => {
    const redirectUrl = getBetaRootRedirectUrl(
      new URL("https://landing.triaxisventures.com/auth"),
      "landing.triaxisventures.com",
    );

    expect(redirectUrl).toBeNull();
  });

  // Reported 2026-07-25: investor.triaxisventures.com's root showed the shared marketing chooser
  // with stale pre-hosting-split content (dead relative /investor, /landing links) instead of
  // going straight into the Investor Preview. Forced demo mode means /dashboard renders with no
  // auth detour on this deployment, so this redirect alone is sufficient to fix it.
  it("redirects investor (Demo) root host to dashboard", () => {
    const redirectUrl = getBetaRootRedirectUrl(
      new URL("https://investor.triaxisventures.com/"),
      "investor.triaxisventures.com",
    );

    expect(redirectUrl?.toString()).toBe("https://investor.triaxisventures.com/dashboard");
  });

  it("does not redirect non-root investor routes", () => {
    const redirectUrl = getBetaRootRedirectUrl(
      new URL("https://investor.triaxisventures.com/dashboard"),
      "investor.triaxisventures.com",
    );

    expect(redirectUrl).toBeNull();
  });

  it("normalizes hosts with ports before canonical checks", () => {
    const redirectUrl = getCanonicalHostRedirectUrl(
      new URL("https://triaxisventures.com/dashboard"),
      "triaxisventures.com:443",
    );

    expect(redirectUrl?.toString()).toBe("https://www.triaxisventures.com/dashboard");
  });

  it("redirects workspace routes on canonical marketing host to beta host", () => {
    const redirectUrl = getMarketingWorkspaceRedirectUrl(
      new URL("https://www.triaxisventures.com/dashboard?tab=active"),
      "www.triaxisventures.com",
    );

    expect(redirectUrl?.toString()).toBe("https://beta.triaxisventures.com/dashboard?tab=active");
  });

  it("redirects auth routes on canonical marketing host to beta host", () => {
    const redirectUrl = getMarketingWorkspaceRedirectUrl(
      new URL("https://www.triaxisventures.com/auth?next=%2Fdashboard"),
      "www.triaxisventures.com",
    );

    expect(redirectUrl?.toString()).toBe("https://beta.triaxisventures.com/auth?next=%2Fdashboard");
  });

  it("keeps marketing root on canonical host", () => {
    const redirectUrl = getMarketingWorkspaceRedirectUrl(
      new URL("https://www.triaxisventures.com/"),
      "www.triaxisventures.com",
    );

    expect(redirectUrl).toBeNull();
  });

  it("requires real Supabase auth by default, matching featureFlags.enableAuthShell", () => {
    expect(isAuthShellEnabledFromEnv(undefined)).toBe(true);
    expect(isAuthShellEnabledFromEnv("true")).toBe(true);
  });

  it("only disables the auth-shell guard when explicitly set to false", () => {
    expect(isAuthShellEnabledFromEnv("false")).toBe(false);
  });

  it("only enables demo mode when explicitly set to true", () => {
    expect(isDemoModeEnabledFromEnv(undefined)).toBe(false);
    expect(isDemoModeEnabledFromEnv("false")).toBe(false);
    expect(isDemoModeEnabledFromEnv("true")).toBe(true);
  });

  it("redirects a protected route to /auth when no session cookie is present (production-safe default)", () => {
    expect(shouldRedirectToLogin("/dashboard", {
      authShellEnabled: true,
      demoModeEnabled: false,
      hasSessionCookie: false,
    })).toBe(true);
  });

  it("does not redirect once a session cookie is present", () => {
    expect(shouldRedirectToLogin("/dashboard", {
      authShellEnabled: true,
      demoModeEnabled: false,
      hasSessionCookie: true,
    })).toBe(false);
  });

  it("does not redirect when demo mode is explicitly enabled", () => {
    expect(shouldRedirectToLogin("/dashboard", {
      authShellEnabled: true,
      demoModeEnabled: true,
      hasSessionCookie: false,
    })).toBe(false);
  });

  it("does not redirect when the auth shell is explicitly disabled for local mock auth", () => {
    expect(shouldRedirectToLogin("/dashboard", {
      authShellEnabled: false,
      demoModeEnabled: false,
      hasSessionCookie: false,
    })).toBe(false);
  });

  it("never redirects a non-protected route such as /auth itself", () => {
    expect(shouldRedirectToLogin("/auth", {
      authShellEnabled: true,
      demoModeEnabled: false,
      hasSessionCookie: false,
    })).toBe(false);
  });
});

// Investor Preview's client-side-only mock session (src/demo/demoMode.ts's localStorage flag) was
// invisible to this Edge Runtime proxy, so "Continue to workspace" bounced a deliberately-entered
// demo session straight back to /auth -- only a real Supabase access-token cookie ever satisfied
// the edge gate. Sprint 1 correction (2026-07-24) adds a non-secret axxess-demo-session cookie the
// proxy also accepts, closing this gap without weakening the real-session check for anyone else.
describe("proxy() accepts a demo-session cookie as well as a real access-token cookie (Investor Preview fix, 2026-07-24)", () => {
  it("redirects to /auth when neither cookie is present", () => {
    const request = new NextRequest("https://beta.triaxisventures.com/dashboard");
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/auth");
  });

  it("passes through when the real access-token cookie is present", () => {
    const request = new NextRequest("https://beta.triaxisventures.com/dashboard", {
      headers: { cookie: "axxess-access-token=real-token-value" },
    });
    const response = proxy(request);

    expect(response.status).not.toBe(307);
  });

  it("passes through when only the demo-session cookie is present, so Investor Preview reaches the workspace", () => {
    const request = new NextRequest("https://beta.triaxisventures.com/dashboard", {
      headers: { cookie: "axxess-demo-session=true" },
    });
    const response = proxy(request);

    expect(response.status).not.toBe(307);
  });
});

// XL-4 (2026-08-05): XLA-21 restricted PAGE routes on the Lite domain but let the entire /api
// prefix through wholesale -- any admin/agentic/social-alert/complex-connector API was fully
// reachable there, protected only by whatever role check exists inside the individual route
// handler. This closes that gap with a deny-by-default allowlist enforced at the edge.
describe("isLiteAllowedApiPath (XL-4): the Lite API allowlist", () => {
  it("allows the shared auth/session/onboarding/documents API families", () => {
    expect(isLiteAllowedApiPath("/api/auth/session")).toBe(true);
    expect(isLiteAllowedApiPath("/api/auth/login")).toBe(true);
    expect(isLiteAllowedApiPath("/api/onboarding/provision")).toBe(true);
    expect(isLiteAllowedApiPath("/api/documents/upload")).toBe(true);
    expect(isLiteAllowedApiPath("/api/documents/upload/complete")).toBe(true);
  });

  it("allows the exact-match leaf routes Lite's shipped and planned feature set needs", () => {
    expect(isLiteAllowedApiPath("/api/profile")).toBe(true);
    expect(isLiteAllowedApiPath("/api/beta-feedback")).toBe(true);
    expect(isLiteAllowedApiPath("/api/audit-exports")).toBe(true);
    expect(isLiteAllowedApiPath("/api/stakeholders/notes")).toBe(true);
    expect(isLiteAllowedApiPath("/api/rag/query")).toBe(true);
    expect(isLiteAllowedApiPath("/api/rag/review")).toBe(true);
  });

  it("allows only the Lite-relevant /api/repositories/[resource] resource types", () => {
    expect(isLiteAllowedApiPath("/api/repositories/tasks")).toBe(true);
    expect(isLiteAllowedApiPath("/api/repositories/meetings")).toBe(true);
    expect(isLiteAllowedApiPath("/api/repositories/projects")).toBe(true);
    expect(isLiteAllowedApiPath("/api/repositories/stakeholders")).toBe(true);
    expect(isLiteAllowedApiPath("/api/repositories/documents")).toBe(true);
    expect(isLiteAllowedApiPath("/api/repositories/document_versions")).toBe(true);
  });

  it("blocks X0-only /api/repositories/[resource] resource types", () => {
    expect(isLiteAllowedApiPath("/api/repositories/users")).toBe(false);
    expect(isLiteAllowedApiPath("/api/repositories/invitations")).toBe(false);
    expect(isLiteAllowedApiPath("/api/repositories/knowledge_articles")).toBe(false);
    expect(isLiteAllowedApiPath("/api/repositories/document_permissions")).toBe(false);
  });

  it("blocks agentic MCP, social alerts, pilot command center, full admin, and complex connector APIs", () => {
    expect(isLiteAllowedApiPath("/api/agents/mcp")).toBe(false);
    expect(isLiteAllowedApiPath("/api/agents/connections")).toBe(false);
    expect(isLiteAllowedApiPath("/api/social-alerts/status")).toBe(false);
    expect(isLiteAllowedApiPath("/api/social-alert-rules")).toBe(false);
    expect(isLiteAllowedApiPath("/api/admin/pilot-command-center")).toBe(false);
    expect(isLiteAllowedApiPath("/api/admin/platform-readiness")).toBe(false);
    expect(isLiteAllowedApiPath("/api/connectors/gmail/messages/import")).toBe(false);
    expect(isLiteAllowedApiPath("/api/connectors/meta-business/sync")).toBe(false);
    expect(isLiteAllowedApiPath("/api/dashboard/mail-signals")).toBe(false);
    expect(isLiteAllowedApiPath("/api/crm/leads")).toBe(false);
    expect(isLiteAllowedApiPath("/api/workflows/timeline")).toBe(false);
    expect(isLiteAllowedApiPath("/api/execution/jobs")).toBe(false);
    expect(isLiteAllowedApiPath("/api/plugins/runtime")).toBe(false);
    expect(isLiteAllowedApiPath("/api/audit-logs")).toBe(false);
    expect(isLiteAllowedApiPath("/api/rag/evaluation")).toBe(false);
  });

  it("denies by default: an unrecognized API path is blocked, not allowed", () => {
    expect(isLiteAllowedApiPath("/api/some-future-route-nobody-added-here-yet")).toBe(false);
  });
});

describe("shouldBlockLiteApiRequest (XL-4)", () => {
  it("blocks a disallowed API path on a known Lite host", () => {
    expect(shouldBlockLiteApiRequest(new URL("https://lite.triaxisventures.com/api/admin/pilot-command-center"), "lite.triaxisventures.com")).toBe(true);
  });

  it("does not block an allowed API path on a known Lite host", () => {
    expect(shouldBlockLiteApiRequest(new URL("https://lite.triaxisventures.com/api/auth/session"), "lite.triaxisventures.com")).toBe(false);
  });

  it("does not block any API path on an X0 host, even the ones blocked on Lite", () => {
    expect(shouldBlockLiteApiRequest(new URL("https://landing.triaxisventures.com/api/admin/pilot-command-center"), "landing.triaxisventures.com")).toBe(false);
  });

  it("does not apply to non-API paths at all", () => {
    expect(shouldBlockLiteApiRequest(new URL("https://lite.triaxisventures.com/dashboard"), "lite.triaxisventures.com")).toBe(false);
  });
});

describe("proxy() enforces the Lite API allowlist end to end (XL-4)", () => {
  it("404s a blocked API route on the Lite host", () => {
    const request = new NextRequest("https://lite.triaxisventures.com/api/admin/pilot-command-center", {
      headers: { host: "lite.triaxisventures.com" },
    });
    const response = proxy(request);

    expect(response.status).toBe(404);
  });

  it("does not 404 an allowed API route on the Lite host", () => {
    const request = new NextRequest("https://lite.triaxisventures.com/api/auth/session", {
      headers: { host: "lite.triaxisventures.com" },
    });
    const response = proxy(request);

    expect(response.status).not.toBe(404);
  });

  it("does not 404 the same blocked-on-Lite API route on an X0 host", () => {
    const request = new NextRequest("https://landing.triaxisventures.com/api/admin/pilot-command-center", {
      headers: { host: "landing.triaxisventures.com", cookie: "axxess-access-token=real-token-value" },
    });
    const response = proxy(request);

    expect(response.status).not.toBe(404);
  });
});

describe("AXXESS_SURFACE runtime handling (XL-4)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("getLiteHostRedirectUrl treats AXXESS_SURFACE=lite as an authoritative surface declaration, independent of the host list", () => {
    vi.stubEnv("AXXESS_SURFACE", "lite");

    const redirectUrl = getLiteHostRedirectUrl(
      new URL("https://some-future-lite-domain.example.com/dashboard"),
      "some-future-lite-domain.example.com",
    );

    expect(redirectUrl?.toString()).toBe("https://some-future-lite-domain.example.com/lite");
  });

  it("shouldBlockLiteApiRequest also honors AXXESS_SURFACE=lite independent of the host list", () => {
    vi.stubEnv("AXXESS_SURFACE", "lite");

    expect(shouldBlockLiteApiRequest(
      new URL("https://some-future-lite-domain.example.com/api/admin/pilot-command-center"),
      "some-future-lite-domain.example.com",
    )).toBe(true);
  });

  it("does not change behavior on a normal X0 host when AXXESS_SURFACE is unset (current live default)", () => {
    expect(getLiteHostRedirectUrl(new URL("https://landing.triaxisventures.com/dashboard"), "landing.triaxisventures.com")).toBeNull();
  });
});

// Investor Demo is an X0-only concept (docs/readiness/AXXESS_LITE_DOCTRINE... Section 3's
// excluded-features table). If NEXT_PUBLIC_AXXESS_DEMO_MODE were ever copied onto the Lite
// Vercel project's env by mistake, this proves the Lite host actively refuses to honor it
// server-side (src/demo/demoMode.test.ts covers the matching client-side check). Tested as a pure
// function rather than only through proxy()'s HTTP responses: currently no reachable Lite HTTP
// path is itself observably affected by this (XLA-21 already redirects protected pages away
// before it's evaluated, and no allowlisted Lite API path is a "protected route"), so this is
// explicit defense-in-depth for any future protected Lite route.
describe("resolveDemoModeEnabled (XL-4): demo mode cannot activate on a Lite host, even if the env var says so", () => {
  it("forces demo mode off on a known Lite host regardless of the env value", () => {
    expect(resolveDemoModeEnabled("lite.triaxisventures.com", undefined, undefined, "true")).toBe(false);
  });

  it("forces demo mode off when AXXESS_SURFACE=lite is set, even on a host not in the Lite list", () => {
    expect(resolveDemoModeEnabled("some-other-host.example.com", undefined, "lite", "true")).toBe(false);
  });

  it("still activates demo mode normally on the real investor/demo host", () => {
    expect(resolveDemoModeEnabled("investor.triaxisventures.com", undefined, undefined, "true")).toBe(true);
  });

  it("stays off on the investor/demo host when the env var itself is not set to true", () => {
    expect(resolveDemoModeEnabled("investor.triaxisventures.com", undefined, undefined, undefined)).toBe(false);
  });
});

// End-to-end confirmation that the one currently-reachable interaction (a protected page path
// redirecting away before demo mode would matter) still behaves correctly on the Lite host.
describe("proxy() end to end: a protected-looking path on the Lite host redirects to /lite regardless of demo env (XL-4)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("redirects /dashboard on the Lite host to /lite even with demo mode forced on by env, never rendering an authenticated demo dashboard there", () => {
    vi.stubEnv("NEXT_PUBLIC_AXXESS_DEMO_MODE", "true");

    const request = new NextRequest("https://lite.triaxisventures.com/dashboard", {
      headers: { host: "lite.triaxisventures.com" },
    });
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/lite");
  });

  it("still tags the real investor/demo host with the demo-authenticated route guard header", () => {
    vi.stubEnv("NEXT_PUBLIC_AXXESS_DEMO_MODE", "true");

    const request = new NextRequest("https://investor.triaxisventures.com/dashboard", {
      headers: { host: "investor.triaxisventures.com" },
    });
    const response = proxy(request);

    expect(response.headers.get("x-axxess-route-guard")).toBe("demo-authenticated");
  });
});
