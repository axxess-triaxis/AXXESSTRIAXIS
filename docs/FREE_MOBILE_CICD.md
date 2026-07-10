# Free Mobile CI/CD

AXXESS now has a parallel Android-first beta build path that does not depend on Expo EAS or Bitrise.

## Android Beta Pipeline

The GitHub Actions workflow lives at:

```text
.github/workflows/mobile-android-free-beta.yml
```

It runs on:

- Manual dispatch from GitHub Actions
- Pushes to `main` when mobile-relevant files change:
  - `apps/mobile/**`
  - `package.json`
  - `pnpm-lock.yaml`
  - `pnpm-workspace.yaml`

The workflow uses GitHub-hosted Linux runners to:

1. Install Node 22 and pnpm 11.
2. Install repository dependencies from the root.
3. Run mobile TypeScript checks.
4. Generate Android native project files with Expo prebuild.
5. Build a debug beta APK with Gradle.
6. Upload the APK as a GitHub Actions artifact.
7. Distribute to Firebase App Distribution when Firebase secrets are configured.

## Firebase App Distribution

Configure these GitHub repository secrets:

```text
FIREBASE_APP_ID_ANDROID
FIREBASE_TESTER_GROUPS
FIREBASE_TOKEN
```

or use a service account JSON instead of `FIREBASE_TOKEN`:

```text
GOOGLE_APPLICATION_CREDENTIALS_JSON
```

If Firebase secrets are missing or incomplete, the workflow does not fail the distribution phase. The Android APK remains available as a GitHub Actions artifact for manual download and testing.

## Local Commands

From `apps/mobile`:

```bash
pnpm run android:ci:build
pnpm run android:firebase:distribute
pnpm run mobile:free:android
```

The local Firebase distribution command expects the same Firebase environment variables used by CI.

## Expo/EAS Status

Expo EAS remains available for now, but it is no longer the only beta build path. Keep EAS while the team verifies the free Android pipeline and decide later whether to retire EAS for routine beta builds.

## iOS Status

iOS is intentionally manual/deferred for this free path. Cloud iOS builds require macOS runners, Apple credentials, and signing assets. At scale, those are not truly free unless the team has Mac access, free macOS minutes, sponsorship, or a paid CI allocation.
