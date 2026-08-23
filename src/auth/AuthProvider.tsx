"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { featureFlags } from "../config/featureFlags";
import {
  cleanTenantUserContext,
  demoModeChangedEvent,
  demoResetEvent,
  demoUserContext,
  isDemoLogin,
  isDemoModeEnabled,
  isDemoModeForcedByEnv,
  isDemoModeSsrSafe,
  refreshDemoSessionCookie,
  setDemoModeEnabled,
} from "../demo/demoMode";
import { clearLiveWorkspaceMetricsCache } from "../hooks/liveWorkspaceMetricsCache";
import { clearAgenticDraft } from "../services/agentic/agenticDraftHandoff";
import { clearStakeholderNoteDraft } from "../services/agentic/stakeholderActionHandoff";
import type { UserContext } from "../security/rbac";
import { createUserProfile, loadStoredUserProfile, mergeUserProfile, saveStoredUserProfile, type LocalUserProfile } from "./localProfile";
import {
  createServerProfile,
  fetchServerSession,
  saveServerProfile,
  signInWithPassword,
  signOutOfSupabase,
} from "./supabaseAuthClient";

export type AuthSession =
  | { status: "loading"; source: "initializing"; user: null }
  | { status: "unauthenticated"; source: "supabase-auth" | "mock-rbac"; user: null }
  | { status: "authenticated"; source: "supabase-auth" | "mock-rbac"; user: UserContext };

type AuthContextValue = {
  session: AuthSession;
  isAuthenticated: boolean;
  login(email: string, password: string): Promise<UserContext>;
  logout(): Promise<void>;
  createProfile(input: LocalUserProfile): Promise<UserContext>;
  updateProfile(input: LocalUserProfile): Promise<UserContext>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function modeAwareMockUser() {
  const user = isDemoModeEnabled() ? demoUserContext : cleanTenantUserContext;
  return mergeUserProfile(user, loadStoredUserProfile(user) ?? {});
}

export function createMockAuthSession(): AuthSession {
  return {
    status: "authenticated",
    source: "mock-rbac",
    user: modeAwareMockUser(),
  };
}

function sessionFromUser(user: UserContext, source: "supabase-auth" | "mock-rbac" = "supabase-auth"): AuthSession {
  return {
    status: "authenticated",
    source,
    user: mergeUserProfile(user, loadStoredUserProfile(user) ?? {}),
  };
}

function getInitialClientSession(): AuthSession {
  // A-106 fix (2026-08-09): must use isDemoModeSsrSafe(), not isDemoModeEnabled(), here specifically --
  // this function seeds a useState lazy initializer, which React calls both during SSR and during the
  // client's hydration-time first render. isDemoModeEnabled() reads localStorage (client-only), so it
  // could disagree between those two calls for a returning demo-mode visitor, producing a real
  // hydration mismatch. The useEffect below re-resolves the real, localStorage-aware answer immediately
  // after mount, so this only changes what renders for one frame before that correction lands -- see
  // docs/readiness/A105_A106_A107_ROOT_CAUSE_ANALYSIS_2026_08_09.md.
  if (isDemoModeSsrSafe()) return createMockAuthSession();
  if (!featureFlags.enableAuthShell) return createMockAuthSession();
  return { status: "loading", source: "initializing", user: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession>(getInitialClientSession);

  useEffect(() => {
    if (isDemoModeEnabled()) {
      // Keep the edge-visible cookie's TTL in sync with the (non-expiring) localStorage flag on
      // every app load -- see refreshDemoSessionCookie's own comment for the exact desync this
      // prevents.
      refreshDemoSessionCookie();
      setSession(createMockAuthSession());
      return;
    }

    if (!featureFlags.enableAuthShell) return;

    let isMounted = true;
    fetchServerSession()
      .then((serverSession) => {
        if (!isMounted) return;
        setSession(serverSession ? sessionFromUser(serverSession.user) : { status: "unauthenticated", source: "supabase-auth", user: null });
      })
      .catch(() => {
        if (isMounted) setSession({ status: "unauthenticated", source: "supabase-auth", user: null });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2026-08-01 incident: this focus/visibilitychange revalidation (added for the session-security
  // fix, meant to catch an already-open tab whose session was revoked server-side) fired an extra
  // concurrent /api/auth/session call on tab focus/navigation, racing against a page's own normal
  // parallel data-fetch calls. Supabase refresh tokens are single-use (rotate on every use): when
  // two concurrent requests both attempted to refresh a near-expiry access token, the losing
  // request's now-already-rotated refresh token failed, and its catch-all error handler wiped
  // cookies for the whole browser -- including the tokens the winning request had just legitimately
  // refreshed. Net effect: clicking into any workspace shortly after login could log the user out
  // entirely. Removed rather than patched around, since it was always a secondary mechanism (the
  // 24h absolute session cap and the /auth real-vs-demo split are the actual security fix and do
  // not depend on this) -- not worth re-introducing until it can coalesce concurrent refresh
  // attempts instead of racing them.

  useEffect(() => {
    function syncDemoSession() {
      if (isDemoModeEnabled() || !featureFlags.enableAuthShell) {
        setSession(createMockAuthSession());
        return;
      }

      setSession({ status: "unauthenticated", source: "supabase-auth", user: null });
    }

    window.addEventListener(demoModeChangedEvent, syncDemoSession);
    window.addEventListener(demoResetEvent, syncDemoSession);
    return () => {
      window.removeEventListener(demoModeChangedEvent, syncDemoSession);
      window.removeEventListener(demoResetEvent, syncDemoSession);
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<UserContext> => {
    if (isDemoLogin(email, password)) {
      setDemoModeEnabled(true);
      setSession(sessionFromUser(demoUserContext, "mock-rbac"));
      return demoUserContext;
    }

    const authState = await signInWithPassword(email, password);
    setSession(sessionFromUser(authState.user));
    return authState.user;
  }, []);

  const logout = useCallback(async () => {
    // Tenant-scoped cache keys already prevent cross-tenant leakage, but clearing on every logout
    // means a different user signing in on the same browser immediately after never has any chance
    // of seeing a cached entry, even a same-tenant one, within the TTL window (F-021 dedup cache).
    clearLiveWorkspaceMetricsCache();
    // MN-5 (2026-08-23): these two sessionStorage keys can hold real institutional text (an
    // AI-answer summary + citations, a stakeholder note draft) for up to 10 minutes after being
    // written -- cleared unconditionally on every logout, demo or real, so a shared/re-used device
    // never carries a signed-out user's draft into the next session.
    clearAgenticDraft();
    clearStakeholderNoteDraft();
    if (isDemoModeEnabled()) {
      setDemoModeEnabled(false);
      setSession(isDemoModeForcedByEnv()
        ? sessionFromUser(demoUserContext, "mock-rbac")
        : featureFlags.enableAuthShell
          ? { status: "unauthenticated", source: "supabase-auth", user: null }
          : sessionFromUser(cleanTenantUserContext, "mock-rbac"));
      return;
    }

    await signOutOfSupabase();
    setSession(featureFlags.enableAuthShell ? { status: "unauthenticated", source: "supabase-auth", user: null } : createMockAuthSession());
  }, []);

  const updateProfile = useCallback(async (input: LocalUserProfile) => {
    if (session.status !== "authenticated") {
      throw new Error("Profile updates require an authenticated session.");
    }
    if (featureFlags.enableAuthShell && session.source === "supabase-auth" && !isDemoModeEnabled()) {
      const authState = await saveServerProfile(input);
      const updatedUser = mergeUserProfile(authState.user, input);
      saveStoredUserProfile(updatedUser, {
        displayName: updatedUser.displayName,
        email: updatedUser.email,
        avatarInitials: updatedUser.avatarInitials,
        department: updatedUser.department,
        title: updatedUser.title,
        timezone: updatedUser.timezone,
      });
      setSession({ ...session, user: updatedUser });
      return updatedUser;
    }
    const updatedUser = mergeUserProfile(session.user, input);
    saveStoredUserProfile(updatedUser, {
      displayName: updatedUser.displayName,
      email: updatedUser.email,
      avatarInitials: updatedUser.avatarInitials,
      department: updatedUser.department,
      title: updatedUser.title,
      timezone: updatedUser.timezone,
    });
    setSession({ ...session, user: updatedUser });
    return updatedUser;
  }, [session]);

  const createProfile = useCallback(async (input: LocalUserProfile) => {
    if (session.status !== "authenticated") {
      throw new Error("Profile creation requires an authenticated session.");
    }
    if (featureFlags.enableAuthShell && session.source === "supabase-auth" && !isDemoModeEnabled()) {
      const authState = await createServerProfile(input);
      const createdUser = mergeUserProfile(authState.user, input);
      saveStoredUserProfile(createdUser, {
        displayName: createdUser.displayName,
        email: createdUser.email,
        avatarInitials: createdUser.avatarInitials,
        department: createdUser.department,
        title: createdUser.title,
        timezone: createdUser.timezone,
      });
      setSession({ ...session, user: createdUser });
      return createdUser;
    }
    const createdUser = createUserProfile(session.user, input);
    saveStoredUserProfile(createdUser, {
      displayName: createdUser.displayName,
      email: createdUser.email,
      avatarInitials: createdUser.avatarInitials,
      department: createdUser.department,
      title: createdUser.title,
      timezone: createdUser.timezone,
    });
    setSession({ ...session, user: createdUser });
    return createdUser;
  }, [session]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    isAuthenticated: session.status === "authenticated",
    login,
    logout,
    createProfile,
    updateProfile,
  }), [session, login, logout, createProfile, updateProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
