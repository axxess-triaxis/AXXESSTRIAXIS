# Mobile Release Runbook

## Triggering builds

- Every push to main that changes relevant mobile/web files triggers the Capacitor workflow.
- Pull requests trigger validation only.
- Manual builds can be triggered with the GitHub Actions workflow dispatch UI.
- Tag-based production release runs are triggered by `v*` tags via `Capacitor Mobile Release`.
- Manual production release runs require `ios_build_number` and `android_version_code` inputs, with optional `app_version`.
- Tag-based store submissions must include build values in the tag name: `vX.Y.Z-ios<build>-android<code>`.
- Example: `v0.9.1-ios42-android42` sets app version `0.9.1`, iOS build number `42`, and Android version code `42`.

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

The release workflow blocks if these are missing.

## Per-release version controls

- `EXPO_PUBLIC_IOS_BUILD_NUMBER` is set from workflow input `ios_build_number`.
- `EXPO_PUBLIC_ANDROID_VERSION_CODE` is set from workflow input `android_version_code`.
- `EXPO_PUBLIC_AXXESS_APP_VERSION` is set from workflow input `app_version`, or tag version (`vX.Y.Z`) when available.
- For tag-triggered runs, all three values are parsed from the tag format `vX.Y.Z-ios<build>-android<code>`.

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
	- iOS: at least one `.ipa` file or `.xcarchive` bundle.
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

- Android preview artifacts can be distributed through Firebase or Play Internal Testing after the credentials are configured.
- iOS builds can be uploaded to TestFlight after the App Store Connect credentials are configured.

## Rollback

- Revert the release tag or Git commit, then re-run the workflow for the prior known-good version.
- Keep the last successful build artifact and metadata for rollback.
