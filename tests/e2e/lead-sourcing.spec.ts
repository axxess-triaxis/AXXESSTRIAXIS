import { expect, test } from "@playwright/test";
import { loginAs, seededUsers, skipUnlessSeeded } from "./helpers";

// Automatic lead sourcing, PR4 (2026-11-18): the Lead sourcing page. A manager sees it, creates a
// schedule that is turned off (so nothing runs and no search is spent), sees it listed, and deletes
// it. A guest has no nav item and every lead sourcing route refuses them. Removing an imported lead
// needs a finished discovery run, which the seed data does not have; route unit tests cover it.
test.describe("lead sourcing", () => {
  test.beforeEach(() => {
    skipUnlessSeeded();
  });

  test("a manager creates a schedule that is off, sees it listed, and deletes it", async ({ page }) => {
    const name = `E2E schedule ${Date.now()}`;
    await loginAs(page, seededUsers.managerAlpha);
    await page.getByRole("button", { name: "Lead sourcing" }).first().click();
    await expect(page.getByRole("heading", { name: "Lead sourcing" })).toBeVisible();
    await expect(page.getByTestId("usage-searches")).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: "New schedule" }).click();
    const form = page.getByTestId("schedule-form");
    await form.getByLabel("Name").fill(name);
    await form.getByLabel("Turned on").uncheck();
    await form.getByRole("button", { name: "Save schedule" }).click();

    const row = page.getByTestId("schedule-row").filter({ hasText: name });
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row.getByText("Off", { exact: true })).toBeVisible();

    page.once("dialog", (dialog) => void dialog.accept());
    await row.getByRole("button", { name: `Delete ${name}` }).click();
    await expect(page.getByTestId("schedule-row").filter({ hasText: name })).toHaveCount(0, { timeout: 20_000 });
  });

  test("a guest has no Lead sourcing item and the API refuses them", async ({ page }) => {
    await loginAs(page, seededUsers.guestAlpha);
    await expect(page.getByRole("button", { name: "Lead sourcing" })).toHaveCount(0);
    expect((await page.request.get("/api/lead-sourcing/schedules")).status()).toBe(403);
    expect((await page.request.get("/api/lead-sourcing/runs")).status()).toBe(403);
    expect((await page.request.get("/api/lead-sourcing/exclusions")).status()).toBe(403);
  });
});
