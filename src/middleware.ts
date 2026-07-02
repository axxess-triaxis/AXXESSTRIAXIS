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
  "/analytics",
  "/settings",
  "/admin",
];

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const isProtectedRoute = protectedRoutePrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix));

  // Sprint 4 guard architecture only. Supabase Auth can replace this marker
  // with a session lookup and tenant assertion in Sprint 5.
  if (isProtectedRoute) {
    response.headers.set("x-axxess-route-guard", "mock-authenticated");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
