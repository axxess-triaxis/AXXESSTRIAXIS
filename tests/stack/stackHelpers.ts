// Shared by the stack specs (tests/stack/*.spec.ts). Uses the AWS CLI so the app's own dependencies
// do not grow for a staging-only test.
import { execFileSync } from "node:child_process";
import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { assertStagingBundle } from "./guard";

export function regionOf(arn: string): string {
  return arn.split(":")[3];
}

export function aws(region: string, ...args: string[]): string {
  return execFileSync("aws", [...args, "--region", region, "--output", "json"], { encoding: "utf8" });
}

// A number that cannot belong to anyone: 555-0100 to 555-0199 are reserved for fiction.
export function testPhone(): string {
  return `+120255501${String(Math.floor(Math.random() * 100)).padStart(2, "0")}`;
}

// A task's description only shows once it is opened, so each row is opened in turn.
export async function countTasksMentioning(page: Page, marker: string): Promise<number> {
  await page.goto("/tasks");
  const rows = page.locator("button.min-w-0.flex-1.text-left");
  await expect(rows.first()).toBeVisible({ timeout: 30_000 });
  let found = 0;
  for (let index = 0; index < (await rows.count()); index += 1) {
    const title = (await rows.nth(index).locator("span").first().textContent())?.trim() ?? "";
    await rows.nth(index).click();
    // Wait for this row's details, then check only this task. A marker in another row's title must not count.
    await expect(page.getByRole("heading", { level: 3, name: title, exact: true })).toBeVisible();
    const inDescription = await page.locator("p.leading-relaxed").filter({ hasText: marker }).count();
    if (title.includes(marker) || inDescription > 0) found += 1;
  }
  return found;
}

export async function expectExactlyOneTask(page: Page, marker: string, timeoutMs = 3 * 60_000) {
  await expect.poll(() => countTasksMentioning(page, marker), { timeout: timeoutMs, intervals: [15_000] }).toBe(1);
}

// Sent only to the staging site: as a browser-wide header it would also reach Supabase, whose CORS rules reject it.
export const bypassHeaders: Record<string, string> = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET, "x-vercel-set-bypass-cookie": "true" }
  : {};

/** Refuses to go on unless the site's own code points at the staging database. */
export async function assertStagingSite(request: APIRequestContext): Promise<void> {
  const html = await (await request.get("/auth", { headers: bypassHeaders })).text();
  const paths = [...new Set(html.match(/\/_next\/static\/[^"\\]+\.js/g) ?? [])];
  assertStagingBundle(await Promise.all(paths.map(async (path) => (await request.get(path, { headers: bypassHeaders })).text())));
}
