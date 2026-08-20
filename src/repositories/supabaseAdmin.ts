type AdminRestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: URLSearchParams;
  body?: Record<string, unknown> | Record<string, unknown>[];
  prefer?: string;
};

// A-67 (2026-08-20): SUPABASE_SERVICE_ROLE_KEY (legacy JWT format) was confirmed invalid in
// production -- "400 Invalid Compact JWS", doesn't parse as a JWT at all, stale from before
// Supabase's key-format migration to publishable/secret keys. SUPABASE_SECRET_KEY is the direct
// modern equivalent (same service-role privilege level, new sb_secret_... format) and was already
// present, unused, in every environment. Preferred here, with the legacy var as a fallback for any
// environment that hasn't been migrated yet.
function getSupabaseAdminConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase admin runtime is not configured.");
  return { url, serviceRoleKey };
}

export function isSupabaseAdminConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
}

export async function supabaseAdminRest<TResponse>(table: string, options: AdminRestOptions = {}) {
  const { url, serviceRoleKey } = getSupabaseAdminConfig();
  const queryString = options.query?.toString();
  const response = await fetch(`${url}/rest/v1/${table}${queryString ? `?${queryString}` : ""}`, {
    method: options.method ?? "GET",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: options.prefer ?? "return=representation",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Supabase admin request failed for ${table}: ${response.status} ${message}`);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as TResponse;
}
