# Mobile Release Readiness -- Kanban and Milestone

Date created: 2026-07-27
Source: root-cause investigation of A-23 (Android)/A-24 (iOS), triggered by a founder request to
push mobile builds forward; matches the pattern established by
`RAG_CAPABILITY_MILESTONE_KANBAN_2026_07_26.md` and
`AI_CAPABILITY_MILESTONE_KANBAN_2026_07_26.md`.

## Scope

Tracks the Capacitor-wrapped mobile app (`apps/mobile-capacitor`) specifically -- the native
Android/iOS shell around the same web kernel deployed at `landing.triaxisventures.com`. Does not
cover the separate Expo/React Native app in `apps/mobile` (a distinct, parallel pipeline with its
own EAS build system, out of scope for this pass).

## Milestone Definition

**"Mobile Release Readiness"** is complete when a real, installable Android build and a real,
installable iOS build both exist as downloadable artifacts, and separately, when both platforms have
a genuine store-signing identity (Android keystore; Apple Developer Program enrollment + App Store
Connect API credentials) allowing a signed release build through `mobile-capacitor-release.yml` to
Google Play internal testing / TestFlight.

## What Was Actually Blocking This (Root Cause, Confirmed 2026-07-27)

Previously tracked in `ACTIONABLES_READINESS_MATRIX.md` as "blocked by credentials" (Android, 65%
confidence) and "blocked on build infrastructure this environment cannot provide" (iOS, 30%
confidence) -- both true, but imprecisely scoped. Direct inspection today found the exact, complete
picture:

- **Two separate GitHub Actions pipelines exist, already built and tested in this repo:**
  `mobile-capacitor.yml` (CI/preview -- unsigned debug artifacts, no secrets required, iOS job runs
  on `macos-13` so the "no Xcode on this machine" limitation does not apply to CI) and
  `mobile-capacitor-release.yml` (store-signed production release -- requires real signing
  credentials).
- **`gh api repos/axxess-triaxis/AXXESSTRIAXIS/environments/production-mobile/secrets` and
  `.../variables` both returned zero entries.** The `production-mobile` GitHub Environment exists
  (created 2026-07-13) but has never had a single secret or variable configured. Every credential the
  release workflow references --
  `ANDROID_KEYSTORE_BASE64`/`ANDROID_KEYSTORE_PASSWORD`/`ANDROID_KEY_ALIAS`/`ANDROID_KEY_PASSWORD`,
  `APPLE_TEAM_ID`/`ASC_KEY_ID`/`ASC_ISSUER_ID`/`ASC_PRIVATE_KEY`,
  `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, and even the app's own
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`/`EXPO_PUBLIC_SUPABASE_ANON_KEY` -- is genuinely absent, not merely
  unverified.
- **The unsigned preview pipeline (`mobile-capacitor.yml`) needs none of that** and was never
  triggered before today (per this repo's GitHub Actions run history).

## Board

### Triggered today, in progress

| Item | Action | Status |
|---|---|---|
| Android preview build | `gh workflow run mobile-capacitor.yml` (workflow_dispatch), `android-preview` job on `ubuntu-latest` | Running -- run [`30240678884`](https://github.com/axxess-triaxis/AXXESSTRIAXIS/actions/runs/30240678884) |
| iOS preview build | Same run, `ios-preview` job on `macos-13` (Xcode pre-installed by GitHub) | Running, same workflow run |

Both produce **unsigned debug artifacts** (a real, installable-for-testing APK and a real Xcode
build product), not store-ready binaries. This is a genuine first: no build of either platform has
completed in this repo's CI history before this run.

### Hard-blocked on external credentials only you can provide (A-23, A-24 store-signed release)

| Platform | What's missing | Where it comes from |
|---|---|---|
| Android | A release keystore (`ANDROID_KEYSTORE_BASE64` + password + key alias + key password) | Can be **generated locally with no external account needed** -- a keystore is a self-created cryptographic identity, not something issued by Google. I can generate one if you want, but it is the permanent signing identity for this app on Google Play once used for a real release -- losing it means the app can never be updated under that identity again. Worth a deliberate decision, not a silent default. |
| Android (optional) | `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, only needed to auto-upload to Play Console | Requires a **company-owned** Google Play Console developer account under Triaxis Ventures Private Limited -- deliberately not being created under the founder's individual account (see governance note below) |
| iOS | `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_PRIVATE_KEY` | Requires an active **company-owned** Apple Developer Program enrollment under Triaxis Ventures Private Limited -- cannot be created or substituted by this agent |

**Root external dependency for both company-owned paths, already tracked and reconfirmed today:**
a D-U-N-S Number for Triaxis Ventures Private Limited, applied for 2026-07-13 (reference
`DR071320262903910840`, Dun & Bradstreet India), still pending as of 2026-07-27. Free-tier issuance
can take up to ~30 days -- expected by approximately 2026-08-12. This is a deliberate governance
decision, not a stalled task: the founder has explicitly rejected releasing under an individual
account to preserve company ownership, store-transfer cleanliness, and enterprise/investor
due-diligence credibility. Full detail, confirmation email, and required next actions in
`MOBILE_STORE_CREDENTIALS_AND_DUNS_DEPENDENCY_2026_07_24.md`.

## Sequencing Recommendation

1. **Let today's preview run finish** -- first real evidence of whether the Capacitor build
   pipeline itself works end to end, independent of signing.
2. **Decide on the Android keystore** -- if you want one generated now, say so explicitly; it's a
   permanent, high-stakes credential once real-world use begins, not a routine action. Note this
   still doesn't unblock a real Play Console release, since that also needs the company-owned
   account, which is itself waiting on the D-U-N-S number below -- only the signing step is
   separable from that dependency.
3. **Both company-owned developer accounts wait on the D-U-N-S number** (reference
   `DR071320262903910840`, expected ~2026-08-12). No engineering action shortens this -- it is
   Dun & Bradstreet's own processing time.
4. Once the D-U-N-S number issues and both company developer accounts are set up, generate the
   remaining credentials, add them to the `production-mobile` GitHub environment, and re-run
   `mobile-capacitor-release.yml` via `workflow_dispatch` for a real signed release build.

## Evidence

`gh api repos/axxess-triaxis/AXXESSTRIAXIS/environments` and
`.../environments/production-mobile/secrets` + `.../variables`, run 2026-07-27 (this session);
`.github/workflows/mobile-capacitor.yml` and `.github/workflows/mobile-capacitor-release.yml`;
`ACTIONABLES_READINESS_MATRIX.md` A-23/A-24.
