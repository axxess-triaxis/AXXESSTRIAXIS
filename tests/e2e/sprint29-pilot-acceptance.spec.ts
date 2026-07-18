import { expect, test } from "@playwright/test";
import { loginAs, seededUsers, skipUnlessSeeded } from "./helpers";

test.describe("Sprint 29 pilot tenant acceptance", () => {
  test.beforeEach(() => {
    skipUnlessSeeded();
  });

  test("shows pilot acceptance and live-ops handoff evidence in the command center", async ({ page }) => {
    await loginAs(page, seededUsers.orgAdminAlpha);

    await page.goto("/admin/pilot-command-center");
    await expect(page.getByRole("heading", { name: "Pilot Command Center" })).toBeVisible();
    await expect(page.getByText("Pilot tenant acceptance")).toBeVisible();
    await expect(page.getByText("Acceptance checklist")).toBeVisible();
    await expect(page.getByText("Live-ops handoff")).toBeVisible();
    await expect(page.getByText("Tenant, profile and sponsor workspace")).toBeVisible();
    await expect(page.getByText("Knowledge ingestion and cited retrieval")).toBeVisible();
    await expect(page.getByRole("button", { name: "Record handoff" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Record pilot acceptance" })).toBeVisible();
  });
});
