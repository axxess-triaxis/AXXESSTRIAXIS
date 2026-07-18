# Sprint 32 - Mobile Store Launch Console & Full-Stack Release Readiness

## Objective

Sprint 32 converts mobile store readiness from a build-pipeline concern into an operator-facing product workflow. The goal is that a release owner can open AXXESS, inspect Android/iOS readiness, review store packs, verify reviewer access, check release health and record staged-rollout evidence without leaving the governance model.

## Product Surface

The new console lives at `/admin/mobile-release` and is available to Super Admin and Organization Admin roles.

It displays:

- Android Play and iOS TestFlight build posture.
- Signed artifact and upload readiness.
- Apple and Google listing pack status.
- Reviewer account readiness and review checklist.
- Store screenshot manifest.
- Crash-free session, webview error and API latency posture.
- Internal testing, TestFlight and staged rollout controls.
- Release gates and next actions.

## Backend

The admin API exposes:

- `GET /api/admin/mobile-release` for the current tenant release snapshot.
- `POST /api/admin/mobile-release` for release snapshot, reviewer verification and rollout update evidence.

POST actions write audit events using the existing tenant audit repository. Supabase persistence is provider-gated and becomes active when the service-role runtime is configured.

## Database

Sprint 32 adds:

- `mobile_release_runs`
- `mobile_store_listings`
- `mobile_reviewer_accounts`
- `mobile_crash_events`
- `mobile_rollout_events`

Each table is organization-scoped, has RLS enabled, grants authenticated read/write access through policies, and grants service-role administrative access for server-side persistence.

## Release Gate

`pnpm run mobile:store:release-gate` verifies:

- Store pack docs exist.
- Screenshot manifest is valid and covers required routes.
- The mobile release admin route and API route exist.
- The console exposes release health and launch readiness.
- Sprint 32 RLS migration contains tenant policies.

The GitHub Actions workflow `Mobile Store Release Readiness` runs the same gate on relevant pull requests and on `main`.

## Provider Gates

- Android Play upload requires `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` and `ANDROID_UPLOAD_TO_PLAY=true`.
- TestFlight upload requires App Store Connect credentials and `IOS_UPLOAD_TO_TESTFLIGHT=true`.
- Legal/product review must approve final privacy labels and Data Safety answers.
- Automated image capture for store screenshots remains the next implementation step.
