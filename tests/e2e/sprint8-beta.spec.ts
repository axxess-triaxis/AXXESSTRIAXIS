import { expect, test } from "@playwright/test";
import { loginAs, logout, seededUsers, skipUnlessSeeded } from "./helpers";

test.describe("Sprint 8 beta analytics and feedback", () => {
  test.beforeEach(() => {
    skipUnlessSeeded();
  });

  test("org admin creates a project, records mock analytics, and submits beta feedback", async ({ page }) => {
    await loginAs(page, seededUsers.orgAdminAlpha);
    await page.goto("/projects");

    const projectName = `Sprint 8 Beta ${Date.now()}`;
    await page.getByRole("button", { name: "New Project" }).click();
    await page.getByLabel("Name").fill(projectName);
    await page.getByLabel("Description").fill("Sprint 8 beta workflow verification.");
    await page.getByLabel("Owner").selectOption({ index: 0 });
    await page.getByLabel("Status").selectOption("planning");
    await page.getByLabel("Priority").selectOption("medium");
    await page.getByRole("button", { name: "Save Project" }).click();

    await expect(page.getByText("Project created.")).toBeVisible();
    await page.getByText(projectName).first().click();

    const eventNames = await page.evaluate(() => {
      const analyticsWindow = window as Window & { __AXXESS_ANALYTICS_EVENTS__?: { eventName: string }[] };
      return analyticsWindow.__AXXESS_ANALYTICS_EVENTS__?.map((event) => event.eventName) ?? [];
    });
    expect(eventNames).toContain("module_opened");
    expect(eventNames).toContain("project_created");

    // The in-app feedback form became a set of survey links in db7ceb40.
    await page.getByRole("button", { name: "Send Feedback" }).click();
    await expect(page.getByRole("dialog", { name: "Help shape AXXESS" })).toBeVisible();
  });

  test("admin can view beta readiness and guest cannot", async ({ page }) => {
    await loginAs(page, seededUsers.orgAdminAlpha);
    await page.goto("/admin/beta-readiness");
    await expect(page.getByText("Beta Readiness").first()).toBeVisible();

    await logout(page);
    await loginAs(page, seededUsers.guestAlpha);
    await page.goto("/admin/beta-readiness");
    await expect(page.getByText("Access restricted")).toBeVisible();
  });
});
