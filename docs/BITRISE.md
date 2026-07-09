# Bitrise

`bitrise.yml` defines workflows for web, Android, iOS, full CI, Playwright, and Supabase RLS artifact checks.

## Workflows

- `primary_web_vercel_check`
- `mobile_android_expo_preview`
- `mobile_ios_expo_preview`
- `full_ci_all_apps`
- `playwright_e2e`
- `supabase_rls_tests`

## Mobile Roots

Expo project root:

```text
apps/mobile
```

Android workflow runs:

```bash
npx expo prebuild --platform android --clean
cd apps/mobile/android
./gradlew assembleRelease
```

Expected APK:

```text
apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

iOS workflow runs Expo prebuild before CocoaPods:

```bash
cd apps/mobile
npx expo prebuild --platform ios --clean
test -f ios/Podfile
```

Signing/export requires Apple credentials.

## Required Secrets

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_ANALYTICS_PROVIDER`
- `NEXT_PUBLIC_MIXPANEL_TOKEN`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `EXPO_TOKEN`
- `APPLE_ID`
- `ASC_APP_ID`
- `APPLE_TEAM_ID`
- Android keystore variables if signing is enabled
