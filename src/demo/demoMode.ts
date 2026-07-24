import type { UserContext } from "../security/rbac";

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

export function isDemoModeForcedByEnv() {
  return process.env.NEXT_PUBLIC_AXXESS_DEMO_MODE === "true";
}

export function isDemoModeEnabled() {
  if (isDemoModeForcedByEnv()) return true;
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(demoModeStorageKey) === "true";
}

function setDemoSessionCookie(enabled: boolean) {
  if (typeof document === "undefined") return;
  document.cookie = enabled
    ? `${demoSessionCookieName}=true; path=/; max-age=${demoSessionCookieMaxAgeSeconds}; SameSite=Lax`
    : `${demoSessionCookieName}=; path=/; max-age=0; SameSite=Lax`;
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
