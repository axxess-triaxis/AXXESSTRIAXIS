import { expect, test } from "@playwright/test";
import { loginAs, seededUsers, skipUnlessSeeded } from "./helpers";

test.describe("Sprint 9 Knowledge Hub", () => {
  test.beforeEach(() => {
    skipUnlessSeeded();
  });

  test("supports search, preview, archive, restore, and permission-aware upload controls", async ({ page }) => {
    await loginAs(page, seededUsers.orgAdminAlpha);
    await page.getByRole("button", { name: /Knowledge Hub/i }).click();

    await expect(page.getByRole("heading", { name: "Knowledge Hub" })).toBeVisible();
    await page.getByPlaceholder(/Search title/i).fill("risk");
    await page.getByRole("button", { name: /Search/i }).click();
    await expect(page.getByText(/risk/i).first()).toBeVisible();

    await page.getByRole("button", { name: /Documents/i }).click();
    await page.getByText(/Risk|Governance|Architecture/i).first().click();
    await expect(page.getByText("Document Preview")).toBeVisible();

    await page.getByRole("button", { name: /Archive/i }).click();
    await expect(page.getByText(/Document archived/i)).toBeVisible();
    await page.getByRole("button", { name: /Archived/i }).click();
    await expect(page.getByRole("button", { name: /Restore/i })).toBeVisible();
    await page.getByRole("button", { name: /Restore/i }).click();
    await expect(page.getByText(/Document restored/i)).toBeVisible();
  });

  test("hides upload actions from guest users", async ({ page }) => {
    await loginAs(page, seededUsers.guestAlpha);
    await page.getByRole("button", { name: /Knowledge Hub/i }).click();

    await expect(page.getByRole("heading", { name: "Knowledge Hub" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Upload/i })).toBeDisabled();
  });
});
