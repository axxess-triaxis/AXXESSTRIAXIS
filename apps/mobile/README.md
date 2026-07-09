# AXXESS Mobile

This is the Sprint 13 Expo beta app scaffold for iOS and Android.

## Project Root

The Expo project root is:

```text
apps/mobile
```

`eas.json` intentionally lives inside `apps/mobile`, because Expo expects EAS files to sit at the Expo app root. In the Expo dashboard, set the GitHub build **Base directory** to `apps/mobile`; leaving it as `/` causes Expo to look for `/eas.json` at the repository root.

## Local Development

```bash
cd apps/mobile
pnpm install
pnpm start
```

Use Expo Go first. Custom builds are only required for signing, store review, or native-module changes.

## Builds

```bash
pnpm android:preview
pnpm ios:preview
pnpm eas:build:all
```

Android preview is configured to produce an APK. iOS preview requires Apple credentials and will stop at signing if those are not configured.

For GitHub-triggered builds, use:

```text
Repository: axxess-triaxis/AXXESSTRIAXIS
Base directory: apps/mobile
Profile: preview or production
iOS bundle identifier: com.triaxis.axxess
Android application ID: com.triaxis.axxess
```

The EAS profiles include explicit `image: latest` settings and `credentialsSource: remote` for GitHub builds, so Expo manages signing credentials.

## EAS Credentials

```bash
pnpm eas:credentials
pnpm eas:credentials:ios
pnpm eas:credentials:android
```

See `docs/EAS_MANAGED_CREDENTIALS.md` from the repository root for the full credential checklist.

## Environment

Mobile uses only public client values:

```text
EXPO_PUBLIC_APP_URL=
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_ANALYTICS_PROVIDER=noop
EXPO_PUBLIC_POSTHOG_KEY=
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
EXPO_PUBLIC_MIXPANEL_TOKEN=
```

Do not add `SUPABASE_SERVICE_ROLE_KEY` or other server secrets to mobile builds.

## Assets

Store-ready `icon.png` and `splash.png` assets must be produced before submission. The app config currently uses colors only so the scaffold remains build-path ready without committing placeholder binaries.
