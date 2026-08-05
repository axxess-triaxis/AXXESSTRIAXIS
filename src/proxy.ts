import { NextResponse, type NextRequest } from "next/server";
import { normalizeHost, resolveIsLiteSurface } from "./config/liteSurfaceHosts";

const protectedRoutePrefixes = [
  "/app",
  "/dashboard",
  "/onboarding",
  "/projects",
  "/programs",
  "/tasks",
  "/workflow-records",
  "/crm",
  "/stakeholders",
  "/knowledge",
  "/documents",
  "/meetings",
  "/approvals",
  "/analytics",
  "/integrations",
  "/settings",
  "/admin",
];

const sessionCookieName = "axxess-access-token";
// Investor Preview's client-side-only mock session (src/demo/demoMode.ts's localStorage flag) is
// invisible to this Edge Runtime proxy -- so "Continue to workspace" and the beta-root redirect
// both bounced a deliberately-entered demo session straight back to /auth, since only a real
// Supabase access-token cookie ever satisfied this gate. This cookie is non-secret (never used for
// real authorization -- tenant-scoped API calls still require a real Supabase session) and is set
// only when a visitor explicitly logs into Investor Preview (src/demo/demoMode.ts).
const demoSessionCookieName = "axxess-demo-session";
const apexProductionHost = "triaxisventures.com";
const canonicalProductionHost = "www.triaxisventures.com";
const betaProductionHost = "beta.triaxisventures.com";
// Product/beta and Demo/investor entry points added in the Sprint 5+ hosting split (docs/readiness/
// HOSTING_DEPLOYMENT_ARCHITECTURE_2026_07_24.md). Without these hosts in the same root-redirect
// rule as `beta.triaxisventures.com`, their `/` fell through to the shared marketing chooser page
// (src/app/page.tsx) -- landing.triaxisventures.com linked out to the Demo (reported 2026-07-25),
// and investor.triaxisventures.com showed stale pre-split content with dead relative links
// (reported the same day) instead of going straight into its own single-purpose experience. On
// investor.triaxisventures.com specifically, this redirect reaches the demo persona with zero
// friction -- forced demo mode (NEXT_PUBLIC_AXXESS_DEMO_MODE=true) skips the login gate entirely
// for that deployment, so `/dashboard` renders immediately, no auth detour.
const dashboardRootRedirectHosts = new Set([
  betaProductionHost,
  "landing.triaxisventures.com",
  "investor.triaxisventures.com",
]);
const marketingOnlyPathname = "/";
const launchListReferralParam = "ref";

// XLA-21 (2026-08-05): the X Lite Web Vercel project (triaxis-product-lite-web) deploys this same
// Next.js app -- without a host-based restriction, X0's full route tree (/dashboard, /admin/*,
// etc.) was reachable on the Lite domain, confirmed live (docs/readiness/
// AXXESS_LITE_DOCTRINE_AND_SURFACE_CONSTITUTION_2026_08_05.md Section 8 ADR addendum). Configurable
// via env so both the default *.vercel.app domain and the eventual custom domain
// (lite.triaxisventures.com, once assigned) are covered without a code change.
// 2026-08-05: hardcoded default MUST include the real custom domain, not just the *.vercel.app
// one -- confirmed live that lite.triaxisventures.com was NOT in this list, meaning
// getLiteHostRedirectUrl() silently no-opped there and the full X0/marketing app served
// unprotected on the production Lite domain, exactly the leak XLA-21 exists to prevent. Relying
// on someone remembering to set AXXESS_LITE_HOSTS correctly on the Vercel project is fragile --
// the real domain now ships as a default, with AXXESS_LITE_HOSTS still available to extend/override.
// Host list itself now lives in src/config/liteSurfaceHosts.ts (XL-4, 2026-08-05) -- shared with
// src/demo/demoMode.ts's client-side demo-mode-forced-off check, so there is exactly one place
// this list can drift out of date, not two.
const liteAllowedPathPrefixes = ["/lite", "/api", "/auth"];

// XL-4 (2026-08-05): XLA-21 restricted PAGE routes to /lite, but let the entire /api prefix
// through wholesale (see liteAllowedPathPrefixes above) -- meaning any admin/agentic/social-alert/
// complex-connector API was fully reachable on the Lite production domain, protected only by
// whatever role check exists inside each individual route handler (a different, deeper trust
// boundary than what XLA-21 was meant to guarantee at the edge). This allowlist closes that gap:
// only the API surface AXXESS Lite's shipped and planned feature set actually needs (auth,
// profile, onboarding, tasks/meetings/projects/stakeholders/documents, RAG-lite, feedback, basic
// audit export -- see docs/readiness/AXXESS_LITE_XL4_HOST_RUNTIME_GATE_CLOSEOUT_2026_08_05.md for
// the full allow/block table) is reachable on the Lite host; everything else 404s at the edge
// before it reaches the route handler. Deny-by-default: a new API route added to the app is
// blocked on the Lite host unless explicitly added here.
const liteAllowedApiExactPaths = new Set([
  "/api/profile",
  "/api/beta-feedback",
  "/api/audit-exports",
  "/api/stakeholders/notes",
  "/api/rag/query",
  "/api/rag/review",
]);

const liteAllowedApiPrefixes = ["/api/auth/", "/api/onboarding/", "/api/documents/"];

// /api/repositories/[resource] is one dynamic route file serving many resource types (see
// src/app/api/repositories/[resource]/route.ts's ResourceName union) -- includes X0-only resources
// like `users`, `invitations`, `knowledge_articles`, `document_permissions`. Only the resource
// types matching Lite's founder-approved required feature set (Work/Meetings/Projects/People/
// Files) are allowed; `document_versions` included alongside `documents` since uploading an actual
// file version is part of the same "Files" capability, not a separate one.
const liteAllowedRepositoryResources = new Set([
  "tasks",
  "meetings",
  "projects",
  "stakeholders",
  "documents",
  "document_versions",
]);

export function isLiteAllowedApiPath(pathname: string): boolean {
  if (liteAllowedApiExactPaths.has(pathname)) {
    return true;
  }
  if (liteAllowedApiPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  const repositoryResource = /^\/api\/repositories\/([^/]+)$/.exec(pathname)?.[1];
  if (repositoryResource) {
    return liteAllowedRepositoryResources.has(repositoryResource);
  }
  return false;
}

export function shouldBlockLiteApiRequest(url: URL, host: string | null) {
  if (!url.pathname.startsWith("/api")) {
    return false;
  }
  if (!resolveIsLiteSurface(host, process.env.AXXESS_LITE_HOSTS, process.env.AXXESS_SURFACE)) {
    return false;
  }
  return !isLiteAllowedApiPath(url.pathname);
}

const workspaceRoutePrefixes = ["/auth", ...protectedRoutePrefixes];

export function isProtectedRoutePath(pathname: string) {
  return protectedRoutePrefixes.some((prefix) => pathname.startsWith(prefix));
}

export function getCanonicalHostRedirectUrl(url: URL, host: string | null) {
  const normalizedHost = normalizeHost(host);
  if (!normalizedHost) {
    return null;
  }

  if (normalizedHost !== apexProductionHost) {
    return null;
  }

  const redirectUrl = new URL(url.toString());
  redirectUrl.protocol = "https:";
  redirectUrl.host = canonicalProductionHost;
  return redirectUrl;
}

export function getBetaRootRedirectUrl(url: URL, host: string | null) {
  const normalizedHost = normalizeHost(host);
  if (!normalizedHost || !dashboardRootRedirectHosts.has(normalizedHost) || url.pathname !== "/") {
    return null;
  }

  if (normalizedHost === "landing.triaxisventures.com" && url.searchParams.has(launchListReferralParam)) {
    return null;
  }

  const redirectUrl = new URL(url.toString());
  redirectUrl.protocol = "https:";
  redirectUrl.host = normalizedHost;
  redirectUrl.pathname = "/dashboard";
  return redirectUrl;
}

export function getMarketingWorkspaceRedirectUrl(url: URL, host: string | null) {
  const normalizedHost = normalizeHost(host);
  if (!normalizedHost || normalizedHost !== canonicalProductionHost) {
    return null;
  }

  if (url.pathname === marketingOnlyPathname) {
    return null;
  }

  const isWorkspaceRoute = workspaceRoutePrefixes.some((prefix) => url.pathname.startsWith(prefix));
  if (!isWorkspaceRoute) {
    return null;
  }

  const redirectUrl = new URL(url.toString());
  redirectUrl.protocol = "https:";
  redirectUrl.host = betaProductionHost;
  return redirectUrl;
}

export function getLiteHostRedirectUrl(url: URL, host: string | null) {
  const normalizedHost = normalizeHost(host);
  if (!normalizedHost || !resolveIsLiteSurface(host, process.env.AXXESS_LITE_HOSTS, process.env.AXXESS_SURFACE)) {
    return null;
  }

  const isAllowedPath = liteAllowedPathPrefixes.some((prefix) => url.pathname.startsWith(prefix));
  if (isAllowedPath) {
    return null;
  }

  const redirectUrl = new URL(url.toString());
  redirectUrl.protocol = "https:";
  redirectUrl.host = normalizedHost;
  redirectUrl.pathname = "/lite";
  redirectUrl.search = "";
  return redirectUrl;
}

// Matches the production-safe default in src/config/featureFlags.ts: real Supabase-backed
// auth is required unless local mock auth is explicitly opted into with `=false`. A stale
// `=== "true"` check here would silently let every deployed environment with the env var
// unset skip the login redirect while the client-side flag (correctly) still required a
// real session -- exactly the F-001 mismatch from the 2026-07-22 beta QA report.
export function isAuthShellEnabledFromEnv(env: string | undefined) {
  return env !== "false";
}

export function isDemoModeEnabledFromEnv(env: string | undefined) {
  return env === "true";
}

// XL-4 (2026-08-05): a Lite request never honors NEXT_PUBLIC_AXXESS_DEMO_MODE=true, regardless of
// what the env var says -- Investor Demo is an X0-only concept (docs/readiness/AXXESS_LITE_
// DOCTRINE_AND_SURFACE_CONSTITUTION_2026_08_05.md Section 3's excluded-features table). This
// closes the "no X0 env vars copied blindly" risk this sprint exists to address: even if
// NEXT_PUBLIC_AXXESS_DEMO_MODE were copied onto the Lite Vercel project's env by mistake, this
// stops it from silently forcing demo data server-side. Currently inert for every *reachable*
// Lite HTTP path -- XLA-21 already redirects protected pages away before this is evaluated, and
// no allowlisted Lite API path is itself a "protected route" per isProtectedRoutePath -- kept as
// explicit defense-in-depth for any future protected Lite route, and directly unit-tested as a
// pure function rather than only through today's (currently unaffected) HTTP responses.
export function resolveDemoModeEnabled(
  host: string | null,
  hostsEnvValue: string | undefined,
  surfaceEnvValue: string | undefined,
  demoEnvValue: string | undefined,
) {
  if (resolveIsLiteSurface(host, hostsEnvValue, surfaceEnvValue)) {
    return false;
  }
  return isDemoModeEnabledFromEnv(demoEnvValue);
}

export function shouldRedirectToLogin(
  pathname: string,
  options: { authShellEnabled: boolean; demoModeEnabled: boolean; hasSessionCookie: boolean },
) {
  return (
    isProtectedRoutePath(pathname)
    && options.authShellEnabled
    && !options.demoModeEnabled
    && !options.hasSessionCookie
  );
}

// Renamed from `middleware` to `proxy` (and this file from middleware.ts to proxy.ts) in Sprint 5,
// following the official `npx @next/codemod@canary middleware-to-proxy .` migration: Next.js 16
// deprecated the `middleware.ts` file convention in favor of `proxy.ts` as a pure rename with no
// runtime behavior change (still an Edge Runtime request interceptor, same `config.matcher`).
export function proxy(request: NextRequest) {
  const requestHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (shouldBlockLiteApiRequest(request.nextUrl, requestHost)) {
    return new NextResponse(null, { status: 404 });
  }

  const liteHostRedirectUrl = getLiteHostRedirectUrl(request.nextUrl, requestHost);
  if (liteHostRedirectUrl) {
    return NextResponse.redirect(liteHostRedirectUrl, 307);
  }

  const canonicalHostRedirectUrl = getCanonicalHostRedirectUrl(
    request.nextUrl,
    requestHost,
  );

  if (canonicalHostRedirectUrl) {
    return NextResponse.redirect(canonicalHostRedirectUrl, 308);
  }

  const marketingWorkspaceRedirectUrl = getMarketingWorkspaceRedirectUrl(request.nextUrl, requestHost);
  if (marketingWorkspaceRedirectUrl) {
    return NextResponse.redirect(marketingWorkspaceRedirectUrl, 307);
  }

  const betaRootRedirectUrl = getBetaRootRedirectUrl(request.nextUrl, requestHost);
  if (betaRootRedirectUrl) {
    return NextResponse.redirect(betaRootRedirectUrl, 307);
  }

  const isAuthShellEnabled = isAuthShellEnabledFromEnv(process.env.NEXT_PUBLIC_AXXESS_AUTH_SHELL);
  const isDemoModeEnabled = resolveDemoModeEnabled(
    requestHost,
    process.env.AXXESS_LITE_HOSTS,
    process.env.AXXESS_SURFACE,
    process.env.NEXT_PUBLIC_AXXESS_DEMO_MODE,
  );
  const isProtectedRoute = isProtectedRoutePath(request.nextUrl.pathname);

  if (shouldRedirectToLogin(request.nextUrl.pathname, {
    authShellEnabled: isAuthShellEnabled,
    demoModeEnabled: isDemoModeEnabled,
    hasSessionCookie: Boolean(request.cookies.get(sessionCookieName)) || Boolean(request.cookies.get(demoSessionCookieName)),
  })) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  if (isProtectedRoute) {
    response.headers.set("x-axxess-route-guard", isDemoModeEnabled ? "demo-authenticated" : isAuthShellEnabled ? "supabase-auth" : "mock-authenticated");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
