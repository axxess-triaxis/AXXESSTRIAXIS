import { cookies } from "next/headers";
import type { UserContext } from "../security/rbac";
import { userContextFromAuthUser, userContextFromSupabaseRow, type SupabaseUserRow } from "./supabaseUser";
import { parseSupabaseAuthErrorResponse } from "./supabaseAuthError";

export const accessTokenCookieName = "axxess-access-token";
export const refreshTokenCookieName = "axxess-refresh-token";

type SupabasePasswordResponse = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  user: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
  };
};

type ServerSession = {
  accessToken: string;
  refreshToken?: string;
  user: UserContext;
};

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
}

function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export function isSupabaseServerConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function setServerAuthCookies(accessToken: string, refreshToken?: string, maxAgeSeconds = 60 * 60) {
  const cookieStore = await cookies();
  cookieStore.set(accessTokenCookieName, accessToken, cookieOptions(maxAgeSeconds));
  if (refreshToken) cookieStore.set(refreshTokenCookieName, refreshToken, cookieOptions(60 * 60 * 24 * 30));
}

export async function clearServerAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.set(accessTokenCookieName, "", cookieOptions(0));
  cookieStore.set(refreshTokenCookieName, "", cookieOptions(0));
}

async function supabaseAuthRequest<TResponse>(path: string, init: RequestInit = {}, accessToken?: string) {
  const supabaseUrl = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!supabaseUrl || !anonKey) throw new Error("Supabase is not configured.");

  const response = await fetch(`${supabaseUrl}/auth/v1/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken ?? anonKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw await parseSupabaseAuthErrorResponse(response);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as TResponse;
}

async function supabaseRestRequest<TResponse>(path: string, accessToken: string) {
  const supabaseUrl = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!supabaseUrl || !anonKey) throw new Error("Supabase is not configured.");

  const response = await fetch(`${supabaseUrl}/rest/v1/${path.replace(/^\//, "")}`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) return undefined;
  return await response.json() as TResponse;
}

async function resolveUser(accessToken: string, authUser: SupabasePasswordResponse["user"]) {
  const rows = await supabaseRestRequest<SupabaseUserRow[]>(
    `users?id=eq.${encodeURIComponent(authUser.id)}&select=id,organization_id,email,display_name,avatar_initials,role,department_name,title,timezone&limit=1`,
    accessToken,
  );

  return rows?.[0] ? userContextFromSupabaseRow(rows[0]) : userContextFromAuthUser(authUser);
}

export async function signInServerSide(email: string, password: string): Promise<ServerSession> {
  const payload = await supabaseAuthRequest<SupabasePasswordResponse>("token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const user = await resolveUser(payload.access_token, payload.user);
  await setServerAuthCookies(payload.access_token, payload.refresh_token, payload.expires_in);
  return { accessToken: payload.access_token, refreshToken: payload.refresh_token, user };
}

// Google/Microsoft OAuth sign-in (see /api/auth/oauth/start) redirects the browser to Supabase's
// own authorize endpoint, which redirects back to /auth/login with access/refresh tokens in the URL
// fragment -- Supabase never calls our server directly. This establishes the same httpOnly-cookie
// session signInServerSide creates for password login, but starting from tokens the client already
// has instead of an email/password pair.
export async function establishServerSessionFromOAuthTokens(accessToken: string, refreshToken?: string): Promise<ServerSession> {
  const authUser = await supabaseAuthRequest<SupabasePasswordResponse["user"]>("user", {}, accessToken);
  const user = await resolveUser(accessToken, authUser);
  await setServerAuthCookies(accessToken, refreshToken);
  return { accessToken, refreshToken, user };
}

async function refreshServerSession(refreshToken: string) {
  const payload = await supabaseAuthRequest<SupabasePasswordResponse>("token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const user = await resolveUser(payload.access_token, payload.user);
  await setServerAuthCookies(payload.access_token, payload.refresh_token, payload.expires_in);
  return { accessToken: payload.access_token, refreshToken: payload.refresh_token, user };
}

export async function getServerAuthSession(allowRefresh = true): Promise<ServerSession | null> {
  if (!isSupabaseServerConfigured()) return null;

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(accessTokenCookieName)?.value;
  const refreshToken = cookieStore.get(refreshTokenCookieName)?.value;

  if (!accessToken && (!allowRefresh || !refreshToken)) return null;

  try {
    if (!accessToken) return refreshServerSession(refreshToken ?? "");
    const payload = await supabaseAuthRequest<SupabasePasswordResponse["user"] | { user: SupabasePasswordResponse["user"] }>("user", {}, accessToken);
    const authUser = "user" in payload ? payload.user : payload;
    const user = await resolveUser(accessToken, authUser);
    return { accessToken, refreshToken, user };
  } catch {
    if (allowRefresh && refreshToken) {
      try {
        return await refreshServerSession(refreshToken);
      } catch {
        await clearServerAuthCookies();
      }
    }
  }

  return null;
}

export async function signOutServerSide(accessToken?: string) {
  if (isSupabaseServerConfigured() && accessToken) {
    await supabaseAuthRequest("logout", { method: "POST" }, accessToken).catch(() => undefined);
  }
  await clearServerAuthCookies();
}
