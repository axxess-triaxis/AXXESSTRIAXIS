import { expect, test } from "@playwright/test";
import { loginAs, seededUsers, skipUnlessSeeded } from "./helpers";

test.describe("task workflows", () => {
  test.beforeEach(() => {
    skipUnlessSeeded();
  });

  test("org admin creates, edits, assigns, and completes a task", async ({ page }) => {
    await loginAs(page, seededUsers.orgAdminAlpha);
    await page.goto("/tasks");

    const taskTitle = `E2E Task ${Date.now()}`;
    await page.getByRole("button", { name: "New Task" }).click();
    await page.getByLabel("Title").fill(taskTitle);
    await page.getByLabel("Description").fill("Created by Sprint 7 Playwright coverage.");
    await page.getByLabel("Assignee").selectOption({ index: 1 });
    await page.getByLabel("Priority").selectOption("high");
    await page.getByLabel("Tags").fill("e2e, assignment");
    await page.getByRole("button", { name: "Save Task" }).click();

    await expect(page.getByText("Task created.")).toBeVisible();
    await expect(page.getByText(taskTitle).first()).toBeVisible();

    await page.getByRole("button", { name: /Edit/ }).click();
    await page.getByLabel("Priority").selectOption("urgent");
    await page.getByRole("button", { name: "Save Task" }).click();
    await expect(page.getByText("Task updated.")).toBeVisible();

    await page.getByRole("button", { name: "Complete task" }).first().click();
    await page.getByRole("button", { name: "Open notifications" }).click();
    await expect(page.getByText("Task updated").first()).toBeVisible();
  });
});
