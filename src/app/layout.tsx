import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "../styles/index.css";

// Added Vexo Analytics script for web React app
export const metadata: Metadata = {
  title: "AXXESS by Triaxis",
  description: "AI-enabled human-in-the-loop institutional intelligence platform.",
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
