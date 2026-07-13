import { NextResponse, type NextRequest } from "next/server";

const protectedRoutePrefixes = [
  "/app",
  "/dashboard",
  "/projects",
  "/programs",
  "/tasks",
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

export function isProtectedRoutePath(pathname: string) {
  return protectedRoutePrefixes.some((prefix) => pathname.startsWith(prefix));
}

export function getCanonicalHostRedirectUrl(url: URL, host: string | null) {
  if (!host) {
    return null;
  }

  const normalizedHost = host.toLowerCase();
  if (normalizedHost !== apexProductionHost) {
    return null;
  }

  const redirectUrl = new URL(url.toString());
  redirectUrl.protocol = "https:";
  redirectUrl.host = canonicalProductionHost;
  return redirectUrl;
}

export function middleware(request: NextRequest) {
  const canonicalHostRedirectUrl = getCanonicalHostRedirectUrl(
    request.nextUrl,
    request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
  );

  if (canonicalHostRedirectUrl) {
    return NextResponse.redirect(canonicalHostRedirectUrl, 308);
  }

  const isAuthShellEnabled = process.env.NEXT_PUBLIC_AXXESS_AUTH_SHELL === "true";
  const isDemoModeEnabled = process.env.NEXT_PUBLIC_AXXESS_DEMO_MODE === "true";
  const isProtectedRoute = isProtectedRoutePath(request.nextUrl.pathname);

  if (isProtectedRoute && isAuthShellEnabled && !isDemoModeEnabled && !request.cookies.get(sessionCookieName)) {
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
