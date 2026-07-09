import { expect, test } from "@playwright/test";

test.describe("Sprint 13 enterprise readiness routes", () => {
  test("loads sign-up and onboarding route surfaces", async ({ page }) => {
    await page.goto("/auth/sign-up");
    await expect(page.getByRole("heading", { name: "Create your AXXESS account" })).toBeVisible();

    await page.goto("/onboarding");
    await expect(page.getByRole("heading", { name: "Enterprise onboarding" })).toBeVisible();

    await page.goto("/onboarding/create-organization");
    await expect(page.getByRole("heading", { name: "Create organization" })).toBeVisible();
  });

  test("loads admin governance and account deletion readiness pages", async ({ page }) => {
    await page.goto("/admin/prompt-approvals");
    await expect(page.getByRole("heading", { name: "Prompt Approvals" })).toBeVisible();

    await page.goto("/settings/account/delete");
    await expect(page.getByRole("heading", { name: "Account deletion" })).toBeVisible();
  });
});
