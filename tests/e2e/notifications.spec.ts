import { expect, test } from "@playwright/test";
import { loginAs, seededUsers, skipUnlessSeeded } from "./helpers";

test.describe("notifications", () => {
  test.beforeEach(() => {
    skipUnlessSeeded();
  });

  test("notification list supports filters, detail view, and mark all read", async ({ page }) => {
    await loginAs(page, seededUsers.orgAdminAlpha);
    await page.getByRole("button", { name: "Open notifications" }).click();
    await expect(page.getByText("Notifications")).toBeVisible();

    await page.getByRole("button", { name: "meeting" }).click();
    await expect(page.getByText("Meeting created").first()).toBeVisible();
    await page.getByText("Meeting created").first().click();
    await expect(page.getByText("Resident portal readiness review was scheduled.")).toBeVisible();

    await page.getByRole("button", { name: /unread/ }).first().click();
    await page.getByRole("button", { name: "unread" }).click();
    await expect(page.getByText("Notifications")).toBeVisible();
  });
});
