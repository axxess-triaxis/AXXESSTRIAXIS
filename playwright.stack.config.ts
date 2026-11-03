import { defineConfig, devices } from "@playwright/test";
import { loadStackConfig } from "./tests/stack/guard";

// Cross-product end-to-end test (AXXESS, Callismatic, Omnidamus, STILL). Staging only: loading
// the config throws unless every target is a staging resource. Kept apart from
// playwright.config.ts so normal CI runs never pick it up.
const config = loadStackConfig();
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: "./tests/stack",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  workers: 1,
  // A flake here means a real cross-product problem, so it is investigated rather than retried.
  retries: 0,
  timeout: 8 * 60_000,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-stack" }]],
  use: {
    baseURL: config.axxessUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    extraHTTPHeaders: bypass ? { "x-vercel-protection-bypass": bypass, "x-vercel-set-bypass-cookie": "true" } : undefined,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
