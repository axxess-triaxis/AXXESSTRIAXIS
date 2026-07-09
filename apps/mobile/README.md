# AXXESS Mobile

This is the Sprint 13 Expo beta app scaffold for iOS and Android.

## Project Root

The Expo project root is:

```text
apps/mobile
```

`eas.json` intentionally lives inside `apps/mobile` to avoid the previous EAS failure where `/eas.json` could not be found. Run EAS commands from this directory or through root scripts such as `pnpm mobile:android:preview`.

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
