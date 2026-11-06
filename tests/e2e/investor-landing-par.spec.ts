import { expect, test } from "@playwright/test";

// Regressions found comparing investor.triaxisventures.com with landing.triaxisventures.com on
// 2026-11-04. Needs a server built with NEXT_PUBLIC_AXXESS_DEMO_MODE=true. The browser uses a zone no
// server here runs in (production is UTC, a founder laptop is IST), so any date rendered without a
// fixed time zone shows up as React error #418.
test.use({ timezoneId: "Pacific/Auckland" });

const demoRoutes = [
  "/dashboard",
  "/projects",
  "/tasks",
  "/integrations",
  "/alerts",
  "/ai-workspace",
  "/ai-workspace/review-inbox",
  "/admin/ai-governance",
  "/admin/mobile-release",
  "/admin/support-ops",
  "/admin/pilot-command-center",
  "/admin/pilot-conversion",
  "/admin/product-analytics",
];

test.describe("Investor demo parity", () => {
  // The dev server compiles each route on first visit, which can take over a minute.
  test.setTimeout(180_000);

  // This spec can also point at the live demo via PLAYWRIGHT_BASE_URL, so keep test traffic out of
  // product analytics.
  test.beforeEach(async ({ page }) => {
    // Match the host only: dev server chunk URLs can contain these words, and blocking those stops hydration.
    await page.route(/^https?:\/\/[^/]*(posthog|mixpanel)\.com\//, (route) => route.abort());
  });

  for (const route of demoRoutes) {
    test(`${route} makes no failing API call and hydrates cleanly`, async ({ page }) => {
      const failedApiCalls: string[] = [];
      const pageErrors: string[] = [];
      page.on("response", (response) => {
        if (response.url().includes("/api/") && response.status() >= 400) {
          failedApiCalls.push(`${response.status()} ${new URL(response.url()).pathname}`);
        }
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));

      await page.goto(route, { waitUntil: "load" });
      await page.waitForTimeout(2500);

      expect(failedApiCalls).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  }

  test("project dates are not raw timestamps", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByRole("heading", { name: "Projects & Programs" })).toBeVisible({ timeout: 90_000 });
    await expect(page.locator("body")).not.toContainText("T08:30:00");
  });

  test("AI Governance agrees with the inbox and does not claim to be live", async ({ page }) => {
    await page.goto("/admin/ai-governance");
    await expect(page.getByText("Dibrugarh referral SLA variance")).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText("No AI outputs are currently pending")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("not a preview");
  });

  test("integration counts agree with each other", async ({ page }) => {
    await page.goto("/integrations");
    const configured = page.locator("div", { hasText: /^Configured$/ }).first().locator("xpath=following-sibling::div");
    const catalogued = page.locator("div", { hasText: /^Adapters catalogued$/ }).first().locator("xpath=following-sibling::div");
    await expect(configured).not.toHaveText("0", { timeout: 90_000 });
    expect(await configured.innerText()).toBe(await catalogued.innerText());
  });

  test("long document lists render one page at a time", async ({ page }) => {
    await page.goto("/documents");
    await expect(page.getByRole("button", { name: /Show more \(\d+ remaining\)/ })).toBeVisible({ timeout: 90_000 });
    expect(await page.evaluate(() => document.querySelectorAll("*").length)).toBeLessThan(10000);
  });

  test("the admin nav has no link to the unbuilt backups panel", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page.locator('a[href="/admin/backups"]')).toHaveCount(0);
  });
});
