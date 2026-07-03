import { expect, test } from "@playwright/test";
import { loginAs, seededUsers, skipUnlessSeeded } from "./helpers";

test.describe("authentication", () => {
  test.beforeEach(() => {
    skipUnlessSeeded();
  });

  test("login and logout work with httpOnly session routes", async ({ page }) => {
    await loginAs(page, seededUsers.orgAdminAlpha);
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByText("Sign in required")).toBeVisible();
  });

  test("protected routes redirect unauthenticated users to auth", async ({ page }) => {
    await page.goto("/projects");
    await expect(page).toHaveURL(/auth/);
  });
});
