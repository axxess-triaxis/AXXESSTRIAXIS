import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "../styles/index.css";

// Added Vexo Analytics script for web React app
const productionSiteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.triaxisventures.com";

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
      <head>
        <script src="https://www.vexo.co/analytics.js" defer></script>
      </head>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
