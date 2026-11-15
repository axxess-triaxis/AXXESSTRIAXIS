import { defineConfig, devices } from "@playwright/test";
import { vercelBypassStatePath } from "./tests/e2e/vercel-bypass.setup";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
// Set only when targeting a protected Vercel deployment such as staging; see tests/e2e/vercel-bypass.setup.ts.
const useVercelBypass = Boolean(process.env.VERCEL_AUTOMATION_BYPASS_SECRET);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  // Seeded specs share the same seeded accounts, and signing out calls Supabase's logout with its default
  // global scope, which revokes every session of that user. Parallel workers would sign each other out.
  workers: process.env.E2E_RUN_SEEDED === "true" ? 1 : undefined,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: useVercelBypass ? "./tests/e2e/vercel-bypass.setup.ts" : undefined,
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    storageState: useVercelBypass ? vercelBypassStatePath : undefined,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: "pnpm run dev --hostname 127.0.0.1",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_AXXESS_AUTH_SHELL: "true",
    },
  },
});
