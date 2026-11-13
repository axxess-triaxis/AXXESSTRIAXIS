"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

// 2026-11-13: Vexo analytics and the LaunchList waitlist widget belong on the public marketing
// pages only. Signed-in screens (Leads & Calls, Stakeholders, Documents) render personal data, so
// these third-party scripts must not load there. An allowlist, so a new app route is safe by
// default. A script that loaded on a marketing page stays for that tab until a full page load;
// sign-in happens on another host (landing.*), which is a full load.
const MARKETING_PATHS = [
  "/",
  "/privacy",
  "/pricing-plans",
  "/founders",
  "/global-south",
  "/axxess-triaxis",
  "/who-we-build-for",
  "/why-axxess-is-disruptive",
];

export function isMarketingPath(pathname: string | null): boolean {
  if (!pathname) return false;
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return MARKETING_PATHS.some((p) => (p === "/" ? path === "/" : path === p || path.startsWith(`${p}/`)));
}

export function MarketingScripts() {
  if (!isMarketingPath(usePathname())) return null;
  return (
    <>
      <Script src="https://www.vexo.co/analytics.js" strategy="afterInteractive" />
      <Script src="https://getlaunchlist.com/js/widget.js" strategy="afterInteractive" />
    </>
  );
}
