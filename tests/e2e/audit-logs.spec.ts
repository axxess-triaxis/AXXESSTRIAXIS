import { expect, test } from "@playwright/test";
import { loginAs, seededUsers, skipUnlessSeeded } from "./helpers";

test.describe("audit logs", () => {
  test.beforeEach(() => {
    skipUnlessSeeded();
  });

  test("admin can read tenant audit logs for key business actions", async ({ page }) => {
    await loginAs(page, seededUsers.orgAdminAlpha);
    const response = await page.request.get("/api/repositories/audit_logs?search=project.created");
    expect(response.ok()).toBe(true);
    const logs = await response.json() as { action: string; organizationId: string }[];
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.some((log) => log.action === "project.created")).toBe(true);
    expect(logs.every((log) => log.organizationId === "10000000-0000-4000-8000-000000000001")).toBe(true);
  });
});
