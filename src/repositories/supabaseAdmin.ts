type AdminRestOptions = {
  method?: "GET" | "POST" | "PATCH";
  query?: URLSearchParams;
  body?: Record<string, unknown> | Record<string, unknown>[];
  prefer?: string;
};

function getSupabaseAdminConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase admin runtime is not configured.");
  return { url, serviceRoleKey };
}

export function isSupabaseAdminConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
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
