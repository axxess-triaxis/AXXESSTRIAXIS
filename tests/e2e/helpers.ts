import { expect, test, type Page } from "@playwright/test";

export const seededPassword = process.env.E2E_AXXESS_PASSWORD ?? "AxxessSprint7!";

export const seededUsers = {
  orgAdminAlpha: process.env.E2E_ORG_ADMIN_ALPHA ?? "orgadmin.alpha@axxess.test",
  managerAlpha: process.env.E2E_MANAGER_ALPHA ?? "manager.alpha1@axxess.test",
  guestAlpha: process.env.E2E_GUEST_ALPHA ?? "guest.alpha@axxess.test",
};

export function skipUnlessSeeded() {
  test.skip(process.env.E2E_RUN_SEEDED !== "true", "Set E2E_RUN_SEEDED=true against the Sprint 7 seeded Supabase branch.");
}

export async function loginAs(page: Page, email: string, password = seededPassword) {
  await page.goto("/auth");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Executive Dashboard").first()).toBeVisible({ timeout: 20_000 });
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/auth|dashboard/);
}
