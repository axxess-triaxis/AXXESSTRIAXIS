# Sprint 31 - Store-Ready Capacitor Release Certification

Sprint 31 turns the existing Capacitor/Webnative mobile shell into a store-certifiable release lane without replacing the web product or deleting Expo compatibility.

## Objective

Capacitor and VS Code should be able to drive finished mobile release artifacts from the monorepo:

- Android: signed Play-ready `.aab`.
- iOS: exported TestFlight-ready `.ipa`.
- GitHub Actions: strict final signoff with checklist and manifest evidence.
- VS Code: discoverable tasks for local release checks and platform builds.

## What Changed

- Added `scripts/apply-capacitor-store-config.mjs` to re-apply store settings after generated Capacitor native projects are created.
- Added `scripts/validate-capacitor-store-readiness.mjs` as the release doctor for Android/iOS native readiness.
- Updated Android to API 36, environment-driven package/versioning, release signing, disabled backup, disabled cleartext traffic, and network security config.
- Updated iOS to environment-driven bundle/version/build settings, valid URL scheme structure, privacy manifest, export options, App Store Connect key handling, IPA export, IPA validation, and optional TestFlight upload.
- Updated `.github/workflows/mobile-capacitor-release.yml` so final signoff requires an Android binary and an iOS `.ipa`.
- Added optional upload gates for Google Play internal testing and TestFlight.
- Added `.vscode/tasks.json` for mobile release readiness and platform builds.

## Release Inputs

Manual production release workflow inputs:

- `app_version`: optional numeric store version, for example `0.9.1`.
- `ios_build_number`: required positive integer.
- `android_version_code`: required positive integer.

Tag release format:

```text
vX.Y.Z-ios<build>-android<code>
```

Example:

```text
v0.9.1-ios42-android42
```

## Required GitHub Environment

Use the `production-mobile` GitHub Actions environment.

Variables:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_APP_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `CAPACITOR_SERVER_URL`
- `CAPACITOR_ALLOWED_HOSTS`
- `ANDROID_APPLICATION_ID`
- `IOS_BUNDLE_IDENTIFIER`
- `ANDROID_UPLOAD_TO_PLAY` set to `true` only when Play upload should run
- `IOS_UPLOAD_TO_TESTFLIGHT` set to `true` only when TestFlight upload should run

Secrets:

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
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` when Play upload is enabled

## VS Code Tasks

Use `Terminal > Run Task`:

- `AXXESS: Mobile Store Readiness`
- `AXXESS: Android Store Build`
- `AXXESS: iOS TestFlight Build`
- `AXXESS: Mobile Release Check`

The iOS build task requires macOS with Xcode. On Windows, the readiness task remains useful, while iOS artifact generation must run on a macOS runner or developer machine.

## Final Signoff

The release workflow now blocks unless:

- Strict preflight passes.
- Capacitor store doctor passes.
- Android produces a signed `.aab` or `.apk`.
- iOS produces an exported `.ipa`.
- Checklist artifacts are present for all, Android and iOS lanes.
- Release manifest is generated with artifact inventory and SHA-256 hashes.

## Remaining Store Review Work

The repository can now drive store-bound artifacts, but store approval still requires account-level material:

- App screenshots for each required device class.
- App privacy labels and data-safety declarations.
- Privacy policy and support URLs.
- App Review and Play review demo credentials.
- Crash reporting and production incident monitoring.
- Final legal/entity details inside App Store Connect and Google Play Console.
