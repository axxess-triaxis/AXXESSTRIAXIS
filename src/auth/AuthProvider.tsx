"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { featureFlags } from "../config/featureFlags";
import { mockCurrentUserContext, type UserContext } from "../security/rbac";
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

export function createMockAuthSession(): AuthSession {
  return {
    status: "authenticated",
    source: "mock-rbac",
    user: mockCurrentUserContext,
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
  if (!featureFlags.enableAuthShell) return createMockAuthSession();
  return { status: "loading", source: "initializing", user: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession>(getInitialClientSession);

  useEffect(() => {
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

  const login = useCallback(async (email: string, password: string) => {
    const authState = await signInWithPassword(email, password);
    setSession(sessionFromUser(authState.user));
  }, []);

  const logout = useCallback(async () => {
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
