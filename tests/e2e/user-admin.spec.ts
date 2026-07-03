import { expect, test } from "@playwright/test";
import { loginAs, seededUsers, skipUnlessSeeded } from "./helpers";

test.describe("user administration", () => {
  test.beforeEach(() => {
    skipUnlessSeeded();
  });

  test("org admin invites a user and changes a role", async ({ page }) => {
    await loginAs(page, seededUsers.orgAdminAlpha);
    await page.goto("/settings");
    await page.getByRole("button", { name: "Users" }).click();

    await page.getByLabel("Email").fill(`invite-${Date.now()}@axxess.test`);
    await page.getByLabel("Role").selectOption("Guest");
    await page.getByRole("button", { name: "Invite" }).click();
    await expect(page.getByText("Invitation created.")).toBeVisible();

    const employeeRow = page.getByText("employee.alpha3@axxess.test").locator("xpath=ancestor::div[contains(@class, 'flex')][1]");
    await employeeRow.locator("select").selectOption("Manager");
    await expect(page.getByText("User updated.")).toBeVisible();
    await employeeRow.locator("select").selectOption("Employee");
  });

  test("manager can view users but cannot change roles", async ({ page }) => {
    await loginAs(page, seededUsers.managerAlpha);
    await page.goto("/settings");
    await page.getByRole("button", { name: "Users" }).click();
    await expect(page.getByText("Your role can view users but cannot modify access.")).toBeVisible();
    await expect(page.locator("select").first()).toBeDisabled();
  });

  test("guest cannot access user administration", async ({ page }) => {
    await loginAs(page, seededUsers.guestAlpha);
    await page.goto("/settings");
    await expect(page.getByText("Access restricted")).toBeVisible();
  });
});
