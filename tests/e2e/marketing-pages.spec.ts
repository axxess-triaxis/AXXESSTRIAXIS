import { expect, test } from "@playwright/test";

// Public pages of www.triaxisventures.com (copy rewritten 2026-11-20). No sign-in, no seeded data.
// Checks each page loads with its new heading, the old URLs still work, and the nav uses the new labels.
const pages = [
  { path: "/", heading: /trying to automate every organization in the world\. we are truly horizontal/i },
  { path: "/axxess-triaxis", heading: /everything becomes a decision\. agents do the rest\./i },
  { path: "/why-axxess-is-disruptive", heading: /work slips because every decision can wait until tomorrow/i },
  { path: "/global-south", heading: /coming to india, uae and eu/i },
  { path: "/who-we-build-for", heading: /any organisation where work gets lost between people and tools/i },
  { path: "/pricing-plans", heading: /priced per seat, per month/i },
  { path: "/founders", heading: /built by sudipta koushik sarmah and ritashree mahanta/i },
];

const retiredPhrases = [
  /organizational os/i,
  /operating layer/i,
  /enterprise brain/i,
  /disruptive in a beautiful way/i,
  // Markets line replaced 2026-11-20 by "Coming to India, UAE and EU".
  /selling first in india and the uae/i,
  /india and the uae first/i,
];

for (const { path, heading } of pages) {
  test(`public page ${path} shows the new copy`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();

    const text = await page.locator("main").innerText();
    for (const phrase of retiredPhrases) {
      expect(text).not.toMatch(phrase);
    }
  });
}

test("founders' story is on /founders and linked from the home page", async ({ page }) => {
  await page.goto("/founders");
  const main = page.locator("main");
  await expect(main).toContainText("lived the problem for 15+ years, first hand, in finance and healthcare");
  await expect(main).toContainText("this founder couple is at work");
  await expect(page.getByRole("region", { name: "Programmes and recognition" })).toBeVisible();
  // Rural Valley stays off the site until its official offer on 23 Nov 2026.
  await expect(main).not.toContainText("Rural Valley");
  await page.goto("/");
  await expect(page.locator("main")).toContainText("15+ years");
  await expect(page.getByRole("link", { name: "Meet the founders" })).toHaveAttribute("href", "/founders");
});

test("home page nav uses the new labels and keeps the old URLs", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Company pages" });
  await expect(nav.getByRole("link", { name: "How It Works" })).toHaveAttribute("href", "/why-axxess-is-disruptive");
  await expect(nav.getByRole("link", { name: "Where We Sell" })).toHaveAttribute("href", "/global-south");
  await expect(page.getByRole("region", { name: "The AXXESS Bundle" })).toBeVisible();
  await expect(page.getByRole("link", { name: "See everything on GitHub" })).toHaveAttribute("href", "https://github.com/axxess-triaxis");
});
