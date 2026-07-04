import type { UserContext } from "../security/rbac";

export type LocalUserProfile = Partial<Pick<UserContext, "displayName" | "email" | "avatarInitials" | "department" | "title" | "timezone">>;

const profileStoragePrefix = "axxess.profile";

function profileStorageKey(user: UserContext) {
  return `${profileStoragePrefix}.${user.organizationId}.${user.id}`;
}

function cleanInitials(value?: string) {
  const normalized = value?.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

export function mergeUserProfile(user: UserContext, profile: LocalUserProfile): UserContext {
  const displayName = profile.displayName?.trim() || user.displayName;
  const email = profile.email?.trim().toLowerCase() || user.email;
  const avatarInitials = cleanInitials(profile.avatarInitials) ?? user.avatarInitials ?? displayName?.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return {
    ...user,
    displayName,
    email,
    avatarInitials,
    department: profile.department?.trim() || user.department,
    title: profile.title?.trim() || user.title,
    timezone: profile.timezone?.trim() || user.timezone,
  };
}

export function loadStoredUserProfile(user: UserContext): LocalUserProfile | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = window.localStorage.getItem(profileStorageKey(user));
  if (!raw) return undefined;

  try {
    return JSON.parse(raw) as LocalUserProfile;
  } catch {
    return undefined;
  }
}

export function saveStoredUserProfile(user: UserContext, profile: LocalUserProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(profileStorageKey(user), JSON.stringify(profile));
}

export function createUserProfile(user: UserContext, input: LocalUserProfile) {
  return mergeUserProfile(user, input);
}
