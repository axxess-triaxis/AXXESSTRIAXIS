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

export function isProtectedRoutePath(pathname: string) {
  return protectedRoutePrefixes.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(request: NextRequest) {
  const isAuthShellEnabled = process.env.NEXT_PUBLIC_AXXESS_AUTH_SHELL === "true";
  const isProtectedRoute = isProtectedRoutePath(request.nextUrl.pathname);

  if (isProtectedRoute && isAuthShellEnabled && !request.cookies.get(sessionCookieName)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  if (isProtectedRoute) response.headers.set("x-axxess-route-guard", isAuthShellEnabled ? "supabase-auth" : "mock-authenticated");

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
