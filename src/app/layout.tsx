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
  verification: {
    google: "Zqn8M8yJDQzHZzalntOFyDt0n1-corgCIO-4bwqESaM",
  },
};

// Facebook JS SDK: appId must be exposed to the browser, so it needs its own NEXT_PUBLIC_ var --
// the server-side META_APP_ID (used for the OAuth token exchange in oauthProvider.ts) is never
// sent to the client bundle. An App ID is not a secret (Meta's own docs embed it directly in
// client-side HTML), so a separate public var is the correct, not just convenient, choice here.
// Renders nothing if unset, rather than loading a broken SDK against an empty appId.
const facebookAppId = process.env.NEXT_PUBLIC_META_APP_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script src="https://www.vexo.co/analytics.js" strategy="afterInteractive" />
        <Script src="https://getlaunchlist.com/js/widget.js" strategy="afterInteractive" />
        {facebookAppId ? (
          <>
            <div id="fb-root" />
            <Script id="facebook-jssdk" strategy="afterInteractive">
              {`
                window.fbAsyncInit = function() {
                  FB.init({
                    appId      : '${facebookAppId}',
                    cookie     : true,
                    xfbml      : true,
                    version    : 'v19.0'
                  });
                  FB.AppEvents.logPageView();
                };
                (function(d, s, id){
                   var js, fjs = d.getElementsByTagName(s)[0];
                   if (d.getElementById(id)) {return;}
                   js = d.createElement(s); js.id = id;
                   js.src = "https://connect.facebook.net/en_US/sdk.js";
                   fjs.parentNode.insertBefore(js, fjs);
                 }(document, 'script', 'facebook-jssdk'));
              `}
            </Script>
          </>
        ) : null}
        <Analytics />
        <SpeedInsights />
        <PostHogSessionReplayInit />
      </body>
    </html>
  );
}
