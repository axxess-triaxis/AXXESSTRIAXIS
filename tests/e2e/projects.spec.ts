import { expect, test } from "@playwright/test";
import { loginAs, seededUsers, skipUnlessSeeded } from "./helpers";

test.describe("project workflows", () => {
  test.beforeEach(() => {
    skipUnlessSeeded();
  });

  test("org admin creates and edits a project", async ({ page }) => {
    await loginAs(page, seededUsers.orgAdminAlpha);
    await page.goto("/projects");

    const projectName = `E2E Project ${Date.now()}`;
    await page.getByRole("button", { name: "New Project" }).click();
    await page.getByLabel("Name").fill(projectName);
    await page.getByLabel("Description").fill("Created by Sprint 7 Playwright coverage.");
    await page.getByLabel("Owner").selectOption({ index: 0 });
    await page.getByLabel("Status").selectOption("planning");
    await page.getByLabel("Priority").selectOption("high");
    await page.getByLabel("Tags").fill("e2e, sprint7");
    await page.getByRole("button", { name: "Save Project" }).click();

    await expect(page.getByText("Project created.")).toBeVisible();
    await expect(page.getByText(projectName).first()).toBeVisible();

    await page.getByRole("button", { name: /Edit/ }).click();
    await page.getByLabel("Description").fill("Updated by Sprint 7 Playwright coverage.");
    await page.getByLabel("Status").selectOption("review");
    await page.getByRole("button", { name: "Save Project" }).click();

    await expect(page.getByText("Project updated.")).toBeVisible();
    await expect(page.getByText("Updated by Sprint 7 Playwright coverage.")).toBeVisible();
  });

  test("cross-organization project is not returned to another tenant", async ({ page }) => {
    await loginAs(page, seededUsers.orgAdminAlpha);
    const response = await page.request.get("/api/repositories/projects?id=40000000-0000-4000-8000-000000000004");
    expect(response.ok()).toBe(true);
    expect(await response.json()).toEqual([]);
  });
});
