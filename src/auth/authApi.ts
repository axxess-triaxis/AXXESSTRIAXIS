import { parseSupabaseAuthErrorResponse } from "./supabaseAuthError";

type SupabaseAuthResponse = Record<string, unknown> | undefined;

function supabaseAuthConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return { url, anonKey };
}

export function isSupabaseAuthApiConfigured() {
  const { url, anonKey } = supabaseAuthConfig();
  return Boolean(url && anonKey);
}

export async function callSupabaseAuth(path: string, body: Record<string, unknown>): Promise<SupabaseAuthResponse> {
  const { url, anonKey } = supabaseAuthConfig();
  if (!url || !anonKey) throw new Error("Supabase Auth is not configured.");

  const response = await fetch(`${url}/auth/v1/${path.replace(/^\//, "")}`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    throw await parseSupabaseAuthErrorResponse(response);
  }

  const text = await response.text();
  return text ? JSON.parse(text) as SupabaseAuthResponse : undefined;
}

export async function updateSupabasePassword(accessToken: string, password: string): Promise<SupabaseAuthResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase Auth is not configured.");

  const response = await fetch(`${url}/auth/v1/user`, {
    method: "PUT",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Supabase password update failed: ${response.status}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) as SupabaseAuthResponse : undefined;
}

export function authProviderEnabled(provider: "google" | "microsoft" | "apple") {
  const key = `NEXT_PUBLIC_AUTH_${provider.toUpperCase()}_ENABLED`;
  return process.env[key] === "true";
}

// Phone/SMS OTP is not an OAuth redirect (no authorize URL, no third-party consent screen) -- it's
// two direct Supabase Auth calls (request OTP, verify OTP) gated on Supabase having an SMS
// provider (e.g. Twilio) configured. Kept as its own flag/function rather than folding into
// authProviderEnabled's Provider union, since the two flows are shaped differently end to end.
export function phoneAuthEnabled() {
  return process.env.NEXT_PUBLIC_AUTH_PHONE_ENABLED === "true";
}
