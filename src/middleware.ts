import { NextResponse, type NextRequest } from "next/server";

const protectedRoutePrefixes = [
  "/app",
  "/dashboard",
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
const apexProductionHost = "triaxisventures.com";
const canonicalProductionHost = "www.triaxisventures.com";
const betaProductionHost = "beta.triaxisventures.com";
const marketingOnlyPathname = "/";

const workspaceRoutePrefixes = ["/auth", ...protectedRoutePrefixes];

function normalizeHost(host: string | null) {
  if (!host) {
    return null;
  }

  return host.toLowerCase().split(":")[0] ?? null;
}

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
  if (!normalizedHost || normalizedHost !== betaProductionHost || url.pathname !== "/") {
    return null;
  }

  const redirectUrl = new URL(url.toString());
  redirectUrl.protocol = "https:";
  redirectUrl.host = betaProductionHost;
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

export function middleware(request: NextRequest) {
  const requestHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

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
  const isDemoModeEnabled = isDemoModeEnabledFromEnv(process.env.NEXT_PUBLIC_AXXESS_DEMO_MODE);
  const isProtectedRoute = isProtectedRoutePath(request.nextUrl.pathname);

  if (shouldRedirectToLogin(request.nextUrl.pathname, {
    authShellEnabled: isAuthShellEnabled,
    demoModeEnabled: isDemoModeEnabled,
    hasSessionCookie: Boolean(request.cookies.get(sessionCookieName)),
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
