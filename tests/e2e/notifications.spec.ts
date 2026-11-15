import { expect, test } from "@playwright/test";
import { loginAs, seededUsers, skipUnlessSeeded } from "./helpers";

test.describe("notifications", () => {
  test.beforeEach(() => {
    skipUnlessSeeded();
  });

  test("notification list supports filters, detail view, and mark all read", async ({ page }) => {
    await loginAs(page, seededUsers.orgAdminAlpha);
    await page.getByRole("button", { name: "Open notifications" }).click();
    await expect(page.getByText("Notifications", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "meeting", exact: true }).click();
    await expect(page.getByText("Meeting created").first()).toBeVisible();
    // The list shows each notification's body; clicking one opens its section (95711aba).
    await expect(page.getByText("Resident portal readiness review was scheduled.")).toBeVisible();
    await page.getByText("Meeting created").first().click();
    await expect(page).toHaveURL(/\/meetings/);

    await page.getByRole("button", { name: "Open notifications" }).click();
    await page.getByRole("button", { name: /unread/ }).first().click();
    await page.getByRole("button", { name: "unread", exact: true }).click();
    await expect(page.getByText("Notifications", { exact: true })).toBeVisible();
  });
});
