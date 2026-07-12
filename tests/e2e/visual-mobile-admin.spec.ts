import { expect, test } from "@playwright/test";

const screenshotRoutes = [
  { name: "organization-admin", path: "/admin/organization?screenshot=true", heading: "Organization Admin" },
  { name: "audit-logs", path: "/admin/audit-logs?screenshot=true", heading: "Audit Logs" },
  { name: "pilot-conversion", path: "/admin/pilot-conversion?screenshot=true", heading: "Pilot Conversion" },
] as const;

test.describe("mobile admin visual screenshots", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true });

  for (const route of screenshotRoutes) {
    test(`captures ${route.name}`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.getByText(route.heading).first()).toBeVisible({ timeout: 20_000 });
      await page.screenshot({
        path: `test-results/mobile-admin-screenshots/${route.name}.png`,
        fullPage: true,
      });
    });
  }
});
