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
import {
  fetchServerSession,
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
};

const AuthContext = createContext<AuthContextValue | null>(null);

function modeAwareMockUser() {
  return isDemoModeEnabled() ? demoUserContext : cleanTenantUserContext;
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
    user,
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

  const value = useMemo<AuthContextValue>(() => ({
    session,
    isAuthenticated: session.status === "authenticated",
    login,
    logout,
  }), [session, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
