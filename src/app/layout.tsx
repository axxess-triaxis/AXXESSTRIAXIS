import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PostHogSessionReplayInit } from "../services/analytics/PostHogSessionReplayInit";
import "../styles/index.css";

// Added Vexo Analytics script for web React app
// A-89 (2026-08-03): CI's `vercel pull` build path (unlike Vercel's own build servers, which the
// prior manual `vercel --prod` CLI deploys used) can resolve this to an empty string rather than
// leaving it unset -- `??` only falls back on null/undefined, so `new URL("")` crashed the build.
const productionSiteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.triaxisventures.com";

export const metadata: Metadata = {
  metadataBase: new URL(productionSiteUrl),
  title: "AXXESS by Triaxis",
  description: "AI-enabled human-in-the-loop institutional intelligence platform.",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/triaxis-cover.png",
    apple: "/triaxis-cover.png",
    shortcut: "/triaxis-cover.png",
  },
  openGraph: {
    url: "/",
    siteName: "AXXESS by Triaxis",
    images: [
      {
        url: "/triaxis-cover.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/triaxis-cover.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script src="https://www.vexo.co/analytics.js" strategy="afterInteractive" />
        <Script src="https://getlaunchlist.com/js/widget.js" strategy="afterInteractive" />
        <Analytics />
        <SpeedInsights />
        <PostHogSessionReplayInit />
      </body>
    </html>
  );
}
