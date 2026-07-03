import { expect, test } from "@playwright/test";
import { loginAs, seededUsers, skipUnlessSeeded } from "./helpers";

test.describe("meeting workflows", () => {
  test.beforeEach(() => {
    skipUnlessSeeded();
  });

  test("org admin creates and edits a meeting with decisions and action items", async ({ page }) => {
    await loginAs(page, seededUsers.orgAdminAlpha);
    await page.goto("/meetings");

    const meetingTitle = `E2E Meeting ${Date.now()}`;
    await page.getByRole("button", { name: "Schedule Meeting" }).click();
    await page.getByLabel("Title").fill(meetingTitle);
    await page.getByLabel("Starts At").fill("2026-07-20T10:00");
    await page.getByLabel("Participants").fill("20000000-0000-4000-8000-000000000002, 20000000-0000-4000-8000-000000000006");
    await page.getByLabel("Agenda").fill("Review Sprint 7 workflow readiness.");
    await page.getByLabel("Decisions").fill("Proceed with seeded branch validation");
    await page.getByLabel("Action Items").fill("Publish Sprint 7 E2E result");
    await page.getByRole("button", { name: "Save Meeting" }).click();

    await expect(page.getByText("Meeting created.")).toBeVisible();
    await expect(page.getByText(meetingTitle).first()).toBeVisible();
    await expect(page.getByText("Proceed with seeded branch validation")).toBeVisible();

    await page.getByRole("button", { name: /Edit/ }).click();
    await page.getByLabel("Notes").fill("Edited by Sprint 7 Playwright coverage.");
    await page.getByRole("button", { name: "Save Meeting" }).click();

    await expect(page.getByText("Meeting updated.")).toBeVisible();
    await expect(page.getByText("Edited by Sprint 7 Playwright coverage.")).toBeVisible();
  });
});
