import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const nav = { pathname: "/" };
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));
vi.mock("next/script", () => ({ default: ({ src }: { src: string }) => <script data-testid="third-party" data-src={src} /> }));

import { MarketingScripts, isMarketingPath } from "./MarketingScripts";

// 2026-11-13: Vexo analytics and the LaunchList widget are for the public marketing pages only.
// Signed-in screens (CRM, stakeholders, documents) show personal data and must not load them.
describe("MarketingScripts", () => {
  afterEach(() => {
    nav.pathname = "/";
  });

  it("loads Vexo and LaunchList on a public marketing page", () => {
    nav.pathname = "/pricing-plans";
    const { container } = render(<MarketingScripts />);
    const srcs = [...container.querySelectorAll("[data-testid=third-party]")].map((el) => el.getAttribute("data-src"));
    expect(srcs).toEqual(["https://www.vexo.co/analytics.js", "https://getlaunchlist.com/js/widget.js"]);
  });

  it.each(["/crm/leads", "/stakeholders", "/dashboard", "/auth", "/lite/people", "/pricing-plans-admin"])(
    "loads nothing on %s",
    (pathname) => {
      nav.pathname = pathname;
      const { container } = render(<MarketingScripts />);
      expect(container.querySelectorAll("[data-testid=third-party]")).toHaveLength(0);
    },
  );

  it("treats only the listed public pages, and their sub-paths, as marketing", () => {
    expect(isMarketingPath("/")).toBe(true);
    expect(isMarketingPath("/privacy")).toBe(true);
    expect(isMarketingPath("/founders/")).toBe(true);
    expect(isMarketingPath("/crm")).toBe(false);
    expect(isMarketingPath(null)).toBe(false);
  });
});
