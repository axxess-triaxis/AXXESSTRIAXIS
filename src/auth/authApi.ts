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
    throw new Error(`Supabase Auth request failed: ${response.status}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) as SupabaseAuthResponse : undefined;
}

export function authProviderEnabled(provider: "google" | "microsoft" | "apple") {
  const key = `NEXT_PUBLIC_AUTH_${provider.toUpperCase()}_ENABLED`;
  return process.env[key] === "true";
}
