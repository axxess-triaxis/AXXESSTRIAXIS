import { expect, test } from "@playwright/test";
import { loginAs, seededUsers, skipUnlessSeeded } from "./helpers";

test.describe("Sprint 17 pilot readiness workflows", () => {
  test.beforeEach(() => {
    skipUnlessSeeded();
  });

  test("admin reviews organization setup on a mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAs(page, seededUsers.orgAdminAlpha);
    await page.goto("/admin/organization");

    await expect(page.getByText("Organization Admin").first()).toBeVisible();
    await expect(page.getByText("Pilot launch controls")).toBeVisible();
    await expect(page.getByText("Pilot team access")).toBeVisible();
  });

  test("admin filters audit logs and can reach them from onboarding", async ({ page }) => {
    await loginAs(page, seededUsers.orgAdminAlpha);
    await page.goto("/admin/audit-logs");

    await expect(page.getByText("Audit Logs").first()).toBeVisible();
    await page.getByRole("button", { name: "ai" }).click();
    await expect(page.getByText("current filter: ai")).toBeVisible();

    await page.goto("/dashboard");
    await page.locator('a[href="/admin/audit-logs"]').first().click();
    await expect(page).toHaveURL(/\/admin\/audit-logs/);
  });
});
