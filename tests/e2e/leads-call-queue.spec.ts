import { expect, test } from "@playwright/test";
import { loginAs, seededUsers, skipUnlessSeeded } from "./helpers";

// GTM Day 3 (2026-11-13): the Leads & Calls page. Staff see it in the navigation and can open both
// tabs; a Guest sees no nav item and the CRM routes refuse them.
test.describe("leads and call queue", () => {
  test.beforeEach(() => {
    skipUnlessSeeded();
  });

  test("a manager opens Leads & Calls and the call queue", async ({ page }) => {
    await loginAs(page, seededUsers.managerAlpha);
    await page.getByRole("button", { name: "Leads & Calls" }).first().click();
    await expect(page.getByRole("heading", { name: "Leads & Calls" })).toBeVisible();
    await page.getByRole("tab", { name: /Call queue/ }).click();
    await expect(page.getByText(/Nobody to call right now|Call \+|Not callable now/).first()).toBeVisible({ timeout: 20_000 });
    const queue = await page.request.get("/api/crm/call-queue");
    expect(queue.ok()).toBe(true);
    const body = await queue.json() as { callable: unknown[]; refused: unknown[] };
    expect(Array.isArray(body.callable) && Array.isArray(body.refused)).toBe(true);
  });

  test("a manager opens the Funnel tab, which shows the ramp and what is not tracked", async ({ page }) => {
    await loginAs(page, seededUsers.managerAlpha);
    await page.getByRole("button", { name: "Leads & Calls" }).first().click();
    await page.getByRole("tab", { name: /Funnel/ }).click();
    await expect(page.getByTestId("ramp-status")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Not tracked yet").first()).toBeVisible();
    const funnel = await page.request.get("/api/crm/funnel?days=30");
    expect(funnel.ok()).toBe(true);
    expect((await funnel.json() as { notTracked: string[] }).notTracked).toEqual(["meetings", "trials", "paid"]);
  });

  test("a guest has no Leads & Calls item and the API refuses them", async ({ page }) => {
    await loginAs(page, seededUsers.guestAlpha);
    await expect(page.getByRole("button", { name: "Leads & Calls" })).toHaveCount(0);
    expect((await page.request.get("/api/crm/call-queue")).status()).toBe(403);
    expect((await page.request.get("/api/crm/funnel")).status()).toBe(403);
  });
});
