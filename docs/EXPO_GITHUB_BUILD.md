# Expo GitHub Build Setup

AXXESS uses a monorepo layout. The Expo app does not live at the repository root; it lives at:

```text
apps/mobile
```

## Fix for `/eas.json` Not Found

If the Expo dashboard shows:

```text
Failed to read "/eas.json". Run `eas build:configure` to create the file.
```

the Expo GitHub build is using the wrong base directory. Set the build base directory to:

```text
apps/mobile
```

Use these values in **Start a build from GitHub**:

```text
GitHub repository: axxess-triaxis/AXXESSTRIAXIS
Base directory: apps/mobile
Git ref: sprint-13-enterprise-mobile-beta-readiness or main after merge
EAS Build profile: preview or production
iOS bundle identifier: com.triaxis.axxess
Android application ID: com.triaxis.axxess
```

This matches Expo's monorepo guidance: run EAS commands from the app directory and keep `eas.json` at that app root.

## Credentials

The warning about missing EAS credentials is expected until Android and iOS signing are configured in Expo. AXXESS build profiles use EAS remote credentials, so Expo should create or store the certificates, provisioning profiles, and Android upload keystore.

Configure credentials from the Expo dashboard or locally:

```bash
cd apps/mobile
eas credentials
```

From the repository root, the same workflow is available through:

```bash
pnpm mobile:eas:credentials
pnpm mobile:eas:credentials:ios
pnpm mobile:eas:credentials:android
```

Do not commit signing credentials, Apple private keys, Google service account JSON, keystores, or provisioning profiles to GitHub.

## Local Verification

From the repository root:

```bash
pnpm mobile:typecheck
pnpm mobile:eas:build:android
pnpm mobile:eas:build:ios
```

The Android preview profile produces an APK. iOS builds require Apple account access and signing credentials before they can complete.
