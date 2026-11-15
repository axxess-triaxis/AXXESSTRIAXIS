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

// 2026-11-15: production outreach tick 05:03Z failed with 401 PGRST303 "JWT issued at future".
// The app sends the opaque sb_secret key; Supabase mints the short-lived JWT itself, so this is
// clock skew inside Supabase, and the next run 14 minutes later succeeded. PostgREST checks the
// JWT before running the request, so nothing was read or written and one retry is safe even for
// writes. Only this exact error is retried; every other failure still throws at once.
const CLOCK_SKEW_RETRY_DELAY_MS = 1000;

function isJwtIssuedInFuture(status: number, body: string) {
  return status === 401 && body.includes("PGRST303") && body.includes("issued at future");
}

export async function supabaseAdminRest<TResponse>(table: string, options: AdminRestOptions = {}) {
  const { url, serviceRoleKey } = getSupabaseAdminConfig();
  const queryString = options.query?.toString();
  const send = () => fetch(`${url}/rest/v1/${table}${queryString ? `?${queryString}` : ""}`, {
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

  let response = await send();
  if (!response.ok) {
    let message = await response.text().catch(() => "");
    if (isJwtIssuedInFuture(response.status, message)) {
      await new Promise((resolve) => setTimeout(resolve, CLOCK_SKEW_RETRY_DELAY_MS));
      response = await send();
      message = response.ok ? "" : await response.text().catch(() => "");
    }
    if (!response.ok) throw new Error(`Supabase admin request failed for ${table}: ${response.status} ${message}`);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as TResponse;
}
