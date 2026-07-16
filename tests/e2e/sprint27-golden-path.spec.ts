import { expect, test } from "@playwright/test";
import { loginAs, seededUsers, skipUnlessSeeded } from "./helpers";

test.describe("Sprint 27 live tenant workflow execution", () => {
  test.beforeEach(() => {
    skipUnlessSeeded();
  });

  test("shows the pilot golden path from dashboard through review, import, and task evidence", async ({ page }) => {
    await loginAs(page, seededUsers.orgAdminAlpha);

    await page.goto("/dashboard");
    await expect(page.getByText("Tenant Health Command Center")).toBeVisible();
    await expect(page.getByText("Workflow timeline")).toBeVisible();
    await expect(page.getByText("Priority actions")).toBeVisible();

    await page.goto("/integrations");
    await expect(page.getByText("Selected mailbox messages")).toBeVisible();
    await page.getByText("Dibrugarh referral SLA review").click();
    await page.getByRole("button", { name: "Preview extraction" }).click();
    await expect(page.getByText(/Review extracted tasks/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirm import" })).toBeEnabled();

    await page.goto("/ai-workspace/review-inbox");
    await expect(page.getByText("AI Review Inbox")).toBeVisible();
    await expect(page.getByText("Review-to-work timeline")).toBeVisible();
    await expect(page.getByRole("button", { name: "Approve and create" }).first()).toBeVisible();

    await page.goto("/tasks");
    await expect(page.getByRole("heading", { name: "Tasks & Workflow" })).toBeVisible();
    await expect(page.getByText(/Task timeline|No description recorded|New Task/i).first()).toBeVisible();
  });
});
