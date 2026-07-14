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
  setDemoModeEnabled,
} from "../demo/demoMode";
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
  login(email: string, password: string): Promise<void>;
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
  if (isDemoModeEnabled()) return createMockAuthSession();
  if (!featureFlags.enableAuthShell) return createMockAuthSession();
  return { status: "loading", source: "initializing", user: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession>(getInitialClientSession);

  useEffect(() => {
    if (isDemoModeEnabled()) {
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

  const login = useCallback(async (email: string, password: string) => {
    if (isDemoLogin(email, password)) {
      setDemoModeEnabled(true);
      setSession(sessionFromUser(demoUserContext, "mock-rbac"));
      return;
    }

    const authState = await signInWithPassword(email, password);
    setSession(sessionFromUser(authState.user));
  }, []);

  const logout = useCallback(async () => {
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
