import { withSentryConfig } from "@sentry/nextjs";

const contentSecurityPolicy = [
  "default-src 'self'",
  // https://connect.facebook.net: the Facebook JS SDK script itself (layout.tsx's
  // "facebook-jssdk" Script, gated on NEXT_PUBLIC_META_APP_ID). Without this the SDK's own
  // <script src> is silently dropped by the browser -- confirmed live in this pass: the inline
  // fbAsyncInit assignment ran fine under the existing 'unsafe-inline', but the SDK file itself
  // never loaded (no connect.facebook.net request, window.FB stayed undefined) until this
  // domain was allowlisted.
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // https://graph.facebook.com / https://www.facebook.com: FB.init()/FB.api() calls the SDK
  // itself makes once loaded (login status, XFBML rendering) -- same reasoning as script-src above.
  // https://*.ingest.us.sentry.io: the Sentry browser SDK's error/tracing beacon (instrumentation-client.ts).
  // Same failure mode as the Facebook SDK note above -- without this in connect-src, Sentry.init()
  // runs fine but every captureException/transaction POST is silently blocked by the browser.
  "connect-src 'self' https://*.supabase.co https://api.mixpanel.com https://*.mixpanel.com https://us.i.posthog.com https://us-assets.i.posthog.com https://app.posthog.com https://*.posthog.com https://graph.facebook.com https://www.facebook.com https://*.ingest.us.sentry.io",
  // Facebook Login/social plugins render inside Meta-hosted iframes -- with no frame-src directive
  // this falls back to default-src 'self' and silently blocks them, same failure mode as above.
  "frame-src https://www.facebook.com https://staticxx.facebook.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  skipTrailingSlashRedirect: true,
  // Real document extraction (documentTextExtraction.ts) depends on @napi-rs/canvas, a native
  // (prebuilt binary) addon pdf-parse's internal pdfjs-dist uses for PDF page rendering/OCR.
  // Without this, Turbopack tries to bundle it into JS instead of leaving it as a real
  // node_modules dependency -- confirmed live 2026-07-31: POST /api/documents/extract crashed in
  // production with "ReferenceError: DOMMatrix is not defined" ("Cannot find module
  // '@napi-rs/canvas'"), even though it installs and runs correctly locally and in tests.
  // serverExternalPackages tells Next.js to leave these as real require()s so Vercel's file
  // tracing includes their actual (including native) files in the deployed function bundle.
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist", "pdf-parse", "tesseract.js", "mammoth"],
  // serverExternalPackages alone wasn't enough for @napi-rs/canvas specifically: confirmed via the
  // actual build trace (route.js.nft.json) that pdf-parse/pdfjs-dist get traced (21/3 files) but
  // @napi-rs/canvas gets zero -- its js-binding.js resolves the platform-specific native binary
  // via runtime detection (readFileSync/execSync), not a static require() string, so @vercel/nft's
  // static analysis can't find it. Force-include the Linux x64 glibc binary specifically (Vercel's
  // serverless runtime architecture) for the one route that actually triggers canvas usage (OCR
  // fallback rendering).
  outputFileTracingIncludes: {
    "/api/documents/extract": ["./node_modules/.pnpm/@napi-rs+canvas-linux-x64-gnu@*/node_modules/@napi-rs/canvas-linux-x64-gnu/**/*"],
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/array/:path*",
        destination: "https://us-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  silent: !process.env.CI,
});
