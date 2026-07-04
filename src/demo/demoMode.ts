import type { UserContext } from "../security/rbac";

export const demoModeStorageKey = "axxess.demoMode.enabled";
export const demoModeChangedEvent = "axxess:demo-mode-changed";
export const demoResetEvent = "axxess:demo-reset";

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

export function setDemoModeEnabled(enabled: boolean) {
  if (typeof window === "undefined" || isDemoModeForcedByEnv()) return;
  window.localStorage.setItem(demoModeStorageKey, enabled ? "true" : "false");
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
