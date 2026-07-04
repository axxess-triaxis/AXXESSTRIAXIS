type EnvKey =
  | "NEXT_PUBLIC_APP_URL"
  | "NEXT_PUBLIC_AXXESS_AUTH_SHELL"
  | "NEXT_PUBLIC_AXXESS_DEMO_MODE"
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY";

export type PublicEnv = Partial<Record<EnvKey, string>>;

export function getPublicEnv(): PublicEnv {
  return {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_AXXESS_AUTH_SHELL: process.env.NEXT_PUBLIC_AXXESS_AUTH_SHELL,
    NEXT_PUBLIC_AXXESS_DEMO_MODE: process.env.NEXT_PUBLIC_AXXESS_DEMO_MODE,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function assertRequiredEnv(env: PublicEnv, keys: EnvKey[]) {
  const missing = keys.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
