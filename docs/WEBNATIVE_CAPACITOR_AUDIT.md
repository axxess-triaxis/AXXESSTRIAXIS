# Webnative Capacitor Audit

## Summary

This repository remains the canonical source of truth for the AXXESS TRIaxis monorepo. The web experience is centered on the existing Next.js App Router application in the repository root, while the existing Expo scaffold in apps/mobile remains in place for temporary compatibility. The new Capacitor/Webnative layer is introduced under apps/mobile-capacitor as a native shell that wraps the same web product rather than replacing it.

## Monorepo structure

- Root web application: Next.js App Router in the repository root
- Shared package: packages/shared
- Existing mobile scaffold: apps/mobile (Expo/EAS)
- New native shell: apps/mobile-capacitor (Capacitor)
- Supabase configuration and migrations: supabase/
- CI workflows: .github/workflows/

## Web build model

The current Next.js application is not a pure static export. It uses the App Router and contains server routes under src/app/api, so the safest production model is to use the deployed production or staging AXXESS URL as the Capacitor server URL and keep the native shell as a webview container around the production web application.

## Capacitor packaging strategy

Selected approach: Option B — use the deployed AXXESS web application as the app URL while retaining a Capacitor shell. This preserves authentication, Supabase access, API routes, RAG workflows, CRM, dashboards, approvals, Knowledge Hub, notifications, analytics and responsive navigation without forcing a full server-side rewrite.

## Routes and features that can run in Capacitor

The Capacitor app can host the same routes that are available on the deployed web app, including:

- dashboards
- CRM and approvals
- Knowledge Hub
- analytics and admin surfaces
- protected routes that rely on the deployed web backend

## Backend/API considerations

Any API calls that depend on the deployed Vercel URL or server-side Next.js routes must continue to target the production or staging deployment URL rather than a local dev server. The Capacitor app should not assume local-only execution.

## Existing Expo dependencies that can remain temporarily

- apps/mobile remains available for existing Expo/EAS workflows.
- Expo-specific mobile configuration and docs remain in place until the Capacitor workflow is fully validated.

## Existing Expo dependencies that should be removed later

- Expo Router and Expo-secure-store usage should be retired once the Capacitor shell is the canonical mobile route.
- The old Expo app scripts can eventually be removed from the root package once native parity is achieved.

## Android/iOS readiness

Current status: repository-level web build and CI are ready, but Android and iOS signing, provisioning profiles, and store credentials still need to be configured by the founders or platform owners through the secure vendor systems.

## Missing signing and store requirements

Required before production release:

- Android keystore and Play Console service account
- iOS distribution certificate, provisioning profile, and App Store Connect API key
- valid bundle identifiers and store metadata

## Risks and recommended migration path

Risks:

- production web routes must remain reachable from the Capacitor shell over HTTPS
- app links and deep links must be validated against the deployed host
- web-only features such as camera/document upload need explicit plugin handling

Recommended migration path:

1. Validate the production/staging URL and allowed hosts.
2. Sync Capacitor and build Android debug and preview artifacts.
3. Add secure signing and store credentials.
4. Promote Capacitor as the primary mobile distribution path after preview validation.
