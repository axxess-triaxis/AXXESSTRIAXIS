# Mobile Release Runbook

## Fully Local Release (No GitHub Actions)

Everything below "Triggering builds" describes the GitHub Actions path. None of it is required --
every step it runs is just calling the same `pnpm run mobile:capacitor:*` scripts this repo already
has, which work identically run by hand on a local machine. Use this path whenever GitHub Actions
isn't available (as happened when the GitHub account behind this repo was suspended) or simply to
avoid depending on it at all going forward.

**Platform split, confirmed by actually running this locally on Windows:**

- **Android: fully buildable locally on Windows.** `pnpm run mobile:capacitor:sync` (or
  `sync:android` for just that platform) completes end to end -- web assets copied, native
  Android project regenerated, all Capacitor plugins registered.
- **iOS: sync completes, but the final native build step needs a Mac.** `cap sync` on Windows
  successfully copies web assets and regenerates `ios/App/App/*`, but the last step
  (`pod install`, via CocoaPods) requires Xcode/CocoaPods, which only run on macOS. Do the iOS
  native build (`mobile:capacitor:build:ios` / `mobile:capacitor:release:ios`) on a Mac, or use the
  existing `mobile:eas:*` (Expo/EAS) scripts for `apps/mobile` if a cloud iOS build is acceptable
  and Expo credentials are configured.

### Local build steps

```bash
# One-time per machine (or after changing native config / plugins):
pnpm run mobile:capacitor:sync                          # both platforms
pnpm --dir apps/mobile-capacitor run sync:android       # Android only, if you only need that platform

# Debug/dev build:
pnpm run mobile:capacitor:build:android     # produces a debug .apk/.aab locally
pnpm run mobile:capacitor:build:ios         # Mac only

# Store-signed release build (needs signing env vars set locally -- see
# docs/ANDROID_SIGNING.md / docs/IOS_SIGNING.md for what to set and where to get it):
pnpm run mobile:capacitor:store:apply       # applies store-specific Capacitor config
pnpm run mobile:capacitor:store:doctor      # verifies readiness before building
pnpm run mobile:capacitor:release:android   # signed .aab, ready for Play Store upload
pnpm run mobile:capacitor:release:ios       # Mac only -- signed .ipa, ready for TestFlight
```

Environment variables read the same way whether the build runs in GitHub Actions or locally --
GitHub Actions just injected them from its own secrets/variables store (see "Production
environment setup" below). Locally, set the same variable names in `.env.local` or your shell
environment before running the commands above; nothing about how the build scripts read them
changes. See `docs/ENVIRONMENT_VARIABLES.md` for the full checklist including which of these are
mobile-specific.

### Store upload

The GitHub Actions workflow uploads to Google Play internal testing / TestFlight automatically via
`r0adkll/upload-google-play` and App Store Connect API credentials. Doing this locally means
uploading the built `.aab`/`.ipa` through each store's own console (Play Console's release
dashboard, Xcode Organizer or Transporter for TestFlight) instead of an automated action -- slower,
but requires nothing GitHub-specific and works from any machine with the right store account
access.

### VS Code tasks work the same way

The "VS Code release tasks" section further down already documents the fully-local path via
`Terminal > Run Task` -- those tasks call the same scripts above and were never GitHub-dependent to
begin with.

## Triggering builds

- Every push to main that changes relevant mobile/web files triggers the Capacitor workflow.
- Pull requests trigger validation only.
- Manual builds can be triggered with the GitHub Actions workflow dispatch UI.
- Tag-based production release runs are triggered by `v*` tags via `Capacitor Mobile Release`.
- Manual production release runs require `ios_build_number` and `android_version_code` inputs, with optional `app_version`.
- Tag-based store submissions must include build values in the tag name: `vX.Y.Z-ios<build>-android<code>`.
- Example: `v0.9.1-ios42-android42` sets app version `0.9.1`, iOS build number `42`, and Android version code `42`.

## Mobile Store Launch Console

Organization Admins can review full-stack mobile launch readiness at `/admin/mobile-release`.

The console covers:

- Android and iOS signing posture.
- Play Store and TestFlight upload posture.
- Store listing packs.
- Reviewer account readiness.
- Screenshot manifest evidence.
- Crash-free sessions, webview error rate and API latency posture.
- Staged rollout tracks.
- Release gates and operator actions.

When Supabase service-role runtime is configured, release operators can record readiness snapshots, reviewer verification and rollout updates with tenant-scoped audit evidence.

## Store submission pack

Store review materials live under `docs/store`:

- `apple-review-notes.md`
- `google-play-notes.md`
- `privacy-labels.md`
- `data-safety.md`
- `screenshot-manifest.json`

Run `pnpm run mobile:store:release-gate` before submitting a store-bound release. The gate verifies that reviewer notes, privacy/data-safety drafts, screenshot manifest, admin route, API route and RLS migration remain present.

## Production environment setup (GitHub Actions)

Create and use the GitHub Actions environment `production-mobile`.

Set repository/environment variables:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_APP_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `CAPACITOR_SERVER_URL`
- `CAPACITOR_ALLOWED_HOSTS`
- `ANDROID_APPLICATION_ID`
- `IOS_BUNDLE_IDENTIFIER`
- `ANDROID_UPLOAD_TO_PLAY` set to `true` only when Google Play internal testing upload should run
- `IOS_UPLOAD_TO_TESTFLIGHT` set to `true` only when TestFlight upload should run

Set repository/environment secrets:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `APPLE_TEAM_ID`
- `ASC_KEY_ID`
- `ASC_ISSUER_ID`
- `ASC_PRIVATE_KEY`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` when Play internal testing upload is enabled

The release workflow blocks if required signing/runtime values are missing. Store upload credentials are required only when the corresponding upload variable is enabled.

## Per-release version controls

- `IOS_BUILD_NUMBER` and `EXPO_PUBLIC_IOS_BUILD_NUMBER` are set from workflow input `ios_build_number`.
- `ANDROID_VERSION_CODE` and `EXPO_PUBLIC_ANDROID_VERSION_CODE` are set from workflow input `android_version_code`.
- `RELEASE_APP_VERSION`, `NEXT_PUBLIC_AXXESS_APP_VERSION` and `EXPO_PUBLIC_AXXESS_APP_VERSION` are set from workflow input `app_version`, or tag version (`vX.Y.Z`) when available.
- For tag-triggered runs, all three values are parsed from the tag format `vX.Y.Z-ios<build>-android<code>`.
- If the manual `app_version` input is blank, the workflow strips any prerelease suffix from `package.json` before applying native store versions.

Set a fresh iOS build number and Android version code for every store submission.

## Automated release checklist artifact

Every production workflow now generates checklist artifacts in both JSON and Markdown formats:

- `release-checklist-all.json/.md` before platform builds.
- `release-checklist-android.json/.md` in Android lane.
- `release-checklist-ios.json/.md` in iOS lane.

These artifacts are uploaded with build outputs for audit and sign-off.

## Release manifest artifact

- Final sign-off generates `release-manifest.json` as a machine-readable artifact for downstream automation.
- The manifest includes:
	- Run metadata (workflow, run id, ref, commit SHA).
	- Release values (app version, iOS build number, Android version code).
	- Artifact file inventory with sizes and SHA-256 digests.
	- Embedded checklist snapshots (`all`, `android`, `ios`).

## Final sign-off gate

- The release workflow now includes a final `release-signoff` job.
- It fails unless all prerequisite jobs succeed and all required checklist artifacts are present:
	- `release-checklist-all.json/.md`
	- `release-checklist-android.json/.md`
	- `release-checklist-ios.json/.md`
- It also fails if Android or iOS artifact archives are empty.
- It also fails unless binary outputs are present:
	- Android: at least one `.aab` or `.apk` file.
	- iOS: at least one exported `.ipa` file.
- It enforces minimum binary size thresholds to reject placeholder builds:
	- Android binary minimum: `1,000,000` bytes.
	- iOS binary minimum: `2,000,000` bytes.
- It validates checklist JSON content and fails if readiness flags are false or any required env presence value is missing.
- It writes a release summary into the GitHub Actions job summary for audit traceability.
- Use this single job as the release decision gate for store submission readiness.

## Disabling automatic builds

Disable or remove the workflow file or use repository settings to pause GitHub Actions for this workflow.

## Rotating credentials

- Rotate Android signing credentials by replacing the secure keystore reference and passwords in the secret store.
- Rotate Apple credentials by replacing the App Store Connect API key and provisioning assets in the secure store.

## Publishing

- Android release artifacts can be uploaded to Google Play Internal Testing when `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` is configured and `ANDROID_UPLOAD_TO_PLAY=true`.
- iOS release artifacts can be uploaded to TestFlight when App Store Connect credentials are configured and `IOS_UPLOAD_TO_TESTFLIGHT=true`.
- If upload variables are not enabled, the workflow still produces store-bound artifacts and release evidence for manual upload.

## VS Code release tasks

Use `Terminal > Run Task`:

- `AXXESS: Mobile Store Readiness`
- `AXXESS: Android Store Build`
- `AXXESS: iOS TestFlight Build`
- `AXXESS: Mobile Release Check`

The iOS build task requires macOS with Xcode. Windows operators should use GitHub Actions or a Mac to generate the IPA.

## Rollback

- Revert the release tag or Git commit, then re-run the workflow for the prior known-good version.
- Keep the last successful build artifact and metadata for rollback.
