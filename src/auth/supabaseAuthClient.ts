import type { UserContext } from "../security/rbac";
import type { LocalUserProfile } from "./localProfile";

export type ClientAuthState = {
  user: UserContext;
};

async function parseAuthResponse(response: Response) {
  const payload = await response.json().catch(() => ({})) as { user?: UserContext; error?: string };

  if (!response.ok || !payload.user) {
    throw new Error(payload.error ?? "Authentication request failed.");
  }

  return { user: payload.user };
}

export async function fetchServerSession(): Promise<ClientAuthState | null> {
  const response = await fetch("/api/auth/session", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 401) return null;
  return parseAuthResponse(response);
}

export async function signInWithPassword(email: string, password: string): Promise<ClientAuthState> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  return parseAuthResponse(response);
}

export async function signOutOfSupabase() {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}

export async function saveServerProfile(input: LocalUserProfile): Promise<ClientAuthState> {
  const response = await fetch("/api/profile", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseAuthResponse(response);
}

export async function createServerProfile(input: LocalUserProfile): Promise<ClientAuthState> {
  const response = await fetch("/api/profile", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseAuthResponse(response);
}
