export const featureFlags = {
  // Off by default. When enabled later, this facade can start reading a real
  // Supabase session without changing route or navigation call sites.
  enableAuthShell: process.env.NEXT_PUBLIC_AXXESS_AUTH_SHELL === "true",
  enableDemoMode: process.env.NEXT_PUBLIC_AXXESS_DEMO_MODE === "true",
  enableSupabaseRuntime: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
} as const;
