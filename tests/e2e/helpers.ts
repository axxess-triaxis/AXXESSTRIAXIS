import { expect, test, type Page } from "@playwright/test";
import { releaseVersion } from "../../src/services/analytics/config";

export const seededPassword = process.env.E2E_AXXESS_PASSWORD ?? "AxxessSprint7!";

export const seededUsers = {
  orgAdminAlpha: process.env.E2E_ORG_ADMIN_ALPHA ?? "orgadmin.alpha@axxess.test",
  managerAlpha: process.env.E2E_MANAGER_ALPHA ?? "manager.alpha1@axxess.test",
  guestAlpha: process.env.E2E_GUEST_ALPHA ?? "guest.alpha@axxess.test",
};

export function skipUnlessSeeded() {
  test.skip(process.env.E2E_RUN_SEEDED !== "true", "Set E2E_RUN_SEEDED=true against the Sprint 7 seeded Supabase branch.");
}

// Specs that read demo-only data or open protected pages without signing in need a target built with
// NEXT_PUBLIC_AXXESS_DEMO_MODE=true: the local dev server in CI (.github/workflows/playwright.yml and
// pilot-golden-path-release-gate.yml set it) or the investor demo. Staging is not a demo build, so these
// skip there. Set NEXT_PUBLIC_AXXESS_DEMO_MODE=true in the Playwright environment only when the target
// really is a demo build.
export function skipUnlessDemoTarget() {
  test.skip(
    process.env.NEXT_PUBLIC_AXXESS_DEMO_MODE !== "true",
    "Needs a target built with NEXT_PUBLIC_AXXESS_DEMO_MODE=true; set it here only when the target is a demo build.",
  );
}

export async function loginAs(page: Page, email: string, password = seededPassword) {
  // The What's New panel opens once per release in a fresh browser and covers the page.
  await page.addInitScript((version) => window.localStorage.setItem("axxess.whats-new.last-seen-version", version), releaseVersion);
  await page.goto("/auth");
  const emailField = page.getByLabel("Email");
  const emailVisible = await emailField.isVisible({ timeout: 5_000 }).catch(() => false);
  if (!emailVisible) {
    await page.goto("/dashboard");
    await expect(page.getByText("Executive Dashboard").first()).toBeVisible({ timeout: 20_000 });
    return;
  }
  await emailField.fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Executive Dashboard").first()).toBeVisible({ timeout: 20_000 });
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/auth|dashboard/);
}
