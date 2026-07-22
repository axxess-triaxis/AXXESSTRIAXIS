export const featureFlags = {
  // Real Supabase-backed auth is the safe default. Local mock auth must be
  // explicitly enabled with NEXT_PUBLIC_AXXESS_AUTH_SHELL=false.
  enableAuthShell: process.env.NEXT_PUBLIC_AXXESS_AUTH_SHELL !== "false",
  enableDemoMode: process.env.NEXT_PUBLIC_AXXESS_DEMO_MODE === "true",
  enableSupabaseRuntime: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
} as const;
