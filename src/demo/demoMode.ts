import type { UserContext } from "../security/rbac";
import { isLiteHost } from "../config/liteSurfaceHosts";

export const demoModeStorageKey = "axxess.demoMode.enabled";
export const demoModeChangedEvent = "axxess:demo-mode-changed";
export const demoResetEvent = "axxess:demo-reset";

// isDemoModeEnabled() is a localStorage-only signal, invisible to src/proxy.ts's Edge Runtime
// middleware -- so Investor Preview's client-side-only mock session never let a visitor past the
// edge's protected-route cookie check, even though the client itself correctly showed them as
// "authenticated." This non-httpOnly, non-secret marker cookie (never used for real authorization --
// tenant-scoped API calls still require a real Supabase session) closes that gap, letting the edge
// proxy recognize a deliberately-entered demo session without changing what demo mode can access.
export const demoSessionCookieName = "axxess-demo-session";
const demoSessionCookieMaxAgeSeconds = 60 * 60 * 12;

export const demoOrganization = {
  id: "org_north_east_health_mission",
  name: "North East Health Mission",
  slug: "north-east-health-mission",
} as const;

export const demoUserContext: UserContext = {
  id: "user_demo_executive",
  organizationId: demoOrganization.id,
  role: "Organization Admin",
  email: "investor.preview@axxess.demo",
  displayName: "Ananya Rao",
  avatarInitials: "AR",
  department: "Mission Secretariat",
  title: "Investor Preview Lead",
  timezone: "Asia/Kolkata",
};

export const cleanTenantUserContext: UserContext = {
  id: "user_clean_admin",
  organizationId: "org_clean_tenant",
  role: "Organization Admin",
  email: "admin@new-organization.local",
  displayName: "Organization Admin",
  avatarInitials: "OA",
  department: "Administration",
  title: "Tenant Owner",
  timezone: "Asia/Kolkata",
};

// XL-4 (2026-08-05): NEXT_PUBLIC_ env vars are project-scoped and baked into the client bundle at
// build time, not request-host-scoped -- so unlike src/proxy.ts's Edge Runtime checks, this
// function alone can't tell which Vercel project's deployment it's running in. It CAN check
// window.location.hostname once hydrated, though, and does: even if
// NEXT_PUBLIC_AXXESS_DEMO_MODE=true were copied onto the Lite Vercel project's env by mistake (the
// "no X0 env vars copied blindly" risk this sprint exists to close), a Lite host actively refuses
// to honor it. Uses the same shared host list as src/proxy.ts (src/config/liteSurfaceHosts.ts) --
// intentionally the hardcoded-default check only (no AXXESS_LITE_HOSTS override), since that env
// var isn't NEXT_PUBLIC_-prefixed and therefore isn't available in this client bundle.
export function isDemoModeForcedByEnv() {
  if (process.env.NEXT_PUBLIC_AXXESS_DEMO_MODE !== "true") {
    return false;
  }
  if (typeof window !== "undefined" && isLiteHost(window.location.hostname, undefined)) {
    return false;
  }
  return true;
}

export function isDemoModeEnabled() {
  if (isDemoModeForcedByEnv()) return true;
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(demoModeStorageKey) === "true";
}

// A-106 fix (2026-08-09): isDemoModeEnabled() reads window.localStorage, which is unavailable during
// SSR and always available by the time the client hydrates -- so calling it directly in a render body
// or a useState lazy initializer returns `false` on the server but can return `true` on the client's
// very first render for any visitor whose browser previously had the (non-expiring) demo-mode flag
// set, e.g. from an earlier Investor Preview session. That's a real, structural server/client mismatch
// (React error #418), confirmed as the root cause of A-106 via two call sites in
// src/features/dashboard/DashboardSection.tsx and src/auth/AuthProvider.tsx's session initializer --
// see docs/readiness/A105_A106_A107_ROOT_CAUSE_ANALYSIS_2026_08_09.md. isDemoModeForcedByEnv() alone is
// safe to call in either context (a build-time env var, identical server and client), so it's the
// correct seed value for anything that must match the server's own render exactly.
export function isDemoModeSsrSafe() {
  return isDemoModeForcedByEnv();
}

export type RuntimeMode = "demo" | "live-tenant" | "unauthenticated";

// TP-2 (2026-07-28): a thin composition of the two signals that were being checked ad hoc (and
// sometimes only one of the two, which is exactly how the A-28 failure class happened) across
// several components -- isDemoModeEnabled() and whether a real session exists. Not a new state
// machine, not a replacement for isDemoModeEnabled() itself (still the source of truth for "demo"),
// just one small, named place to get the three-way answer instead of re-deriving it per call site.
// "Investor Preview" is this same "demo" state under different user-facing copy, not a fourth
// distinct runtime state -- there is no separate flag for it anywhere in this codebase.
export function getRuntimeMode(isAuthenticated: boolean): RuntimeMode {
  if (isDemoModeEnabled()) return "demo";
  return isAuthenticated ? "live-tenant" : "unauthenticated";
}

function setDemoSessionCookie(enabled: boolean) {
  if (typeof document === "undefined") return;
  document.cookie = enabled
    ? `${demoSessionCookieName}=true; path=/; max-age=${demoSessionCookieMaxAgeSeconds}; SameSite=Lax`
    : `${demoSessionCookieName}=; path=/; max-age=0; SameSite=Lax`;
}

// Attempt 4 (2026-07-24) root cause: the edge-visible axxess-demo-session cookie expires after 12
// hours, but the localStorage flag isDemoModeEnabled() reads never expires. Once the cookie lapses
// while localStorage still says demo mode is on, the client renders "Signed in as Ananya Rao" (a
// pure client-side check) while src/proxy.ts's edge guard sees no valid cookie and bounces
// /dashboard back to /auth -- which immediately re-renders the same "Signed in" screen, so
// "Continue to workspace" looks completely dead. Call this once per app load whenever
// isDemoModeEnabled() is true (AuthProvider does, on mount) to keep the two signals in sync as long
// as the visitor keeps using the app, without waiting for another explicit login.
export function refreshDemoSessionCookie() {
  setDemoSessionCookie(true);
}

export function setDemoModeEnabled(enabled: boolean) {
  if (typeof window === "undefined" || isDemoModeForcedByEnv()) return;
  window.localStorage.setItem(demoModeStorageKey, enabled ? "true" : "false");
  setDemoSessionCookie(enabled);
  window.dispatchEvent(new CustomEvent(demoModeChangedEvent, { detail: { enabled } }));
}

export function resetDemoEnvironment() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(demoResetEvent));
  }
}

export function isDemoLogin(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim().toLowerCase();

  return (
    normalizedEmail === "demo@axxess.local"
    || normalizedEmail === "investor.preview@axxess.demo"
  ) && ["demo", "preview", "axxess"].includes(normalizedPassword);
}
