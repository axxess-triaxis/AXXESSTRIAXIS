import { expect, test, type Locator } from "@playwright/test";
import { releaseVersion } from "../../src/services/analytics/config";
import { skipUnlessDemoTarget } from "./helpers";

// Founder report from staging (2026-11-23): the sidebar was cut off at the bottom of the screen and
// its lower items could not be reached. The sidebar list and the main content each scroll on their own.
const scrollTop = (locator: Locator) => locator.evaluate((element) => element.scrollTop);

const viewports = [
  { name: "short desktop", viewport: { width: 1280, height: 500 }, mobile: false },
  { name: "phone", viewport: { width: 390, height: 600 }, mobile: true },
];

for (const { name, viewport, mobile } of viewports) {
  test.describe(`app shell scroll, ${name}`, () => {
    test.setTimeout(180_000);
    test.use({ viewport });

    // Opens the shell without signing in, which only a demo build allows.
    test.beforeEach(() => {
      skipUnlessDemoTarget();
    });

    test("the sidebar and the main content scroll separately", async ({ page }) => {
      // The What's New panel opens once per release in a fresh browser and covers the page.
      await page.addInitScript((version) => window.localStorage.setItem("axxess.whats-new.last-seen-version", version), releaseVersion);
      await page.goto("/tasks", { waitUntil: "load" });
      if (mobile) await page.getByRole("button", { name: "Open navigation menu" }).click();

      const sidebar = page.getByRole("complementary", { name: "Primary navigation" });
      const nav = sidebar.getByRole("navigation");
      const main = page.getByRole("main");
      await expect(nav).toBeVisible({ timeout: 30_000 });

      // The whole sidebar, profile button included, fits the screen.
      const box = await sidebar.boundingBox();
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
      await expect(sidebar.getByRole("button").last()).toBeInViewport({ ratio: 1 });

      // Scrolling the sidebar reaches its last item and leaves the main content where it was.
      await nav.hover();
      await page.mouse.wheel(0, 5000);
      await expect.poll(() => scrollTop(nav)).toBeGreaterThan(0);
      await expect(nav.getByRole("button").last()).toBeInViewport({ ratio: 1 });
      expect(await scrollTop(main)).toBe(0);

      // At the end of the list, more scrolling still does not move the main content.
      await page.mouse.wheel(0, 5000);
      await page.waitForTimeout(300);
      expect(await scrollTop(main)).toBe(0);
      if (mobile) return;

      const navTop = await scrollTop(nav);
      await main.hover({ position: { x: 5, y: 100 } });
      await page.mouse.wheel(0, 5000);
      await expect.poll(() => scrollTop(main)).toBeGreaterThan(0);
      expect(await scrollTop(nav)).toBe(navTop);
      expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(0);
    });
  });
}
