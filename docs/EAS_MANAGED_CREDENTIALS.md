# EAS Managed Credentials

AXXESS mobile builds are configured to use Expo-managed credentials for both iOS and Android.

## App Identifiers

The current production identifiers are:

```text
iOS bundle identifier: com.triaxis.axxess
Android application ID: com.triaxis.axxess
Expo owner: axxess-triaxis
Expo slug: axxess-triaxis
```

These are defined in `apps/mobile/app.config.ts` and can be overridden only through public build-time variables:

```text
EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER=com.triaxis.axxess
EXPO_PUBLIC_ANDROID_APPLICATION_ID=com.triaxis.axxess
EXPO_PUBLIC_EAS_PROJECT_ID=
```

## EAS Build Profiles

All build profiles in `apps/mobile/eas.json` use:

```json
"credentialsSource": "remote"
```

for both `ios` and `android`. This tells EAS Build to use credentials stored by Expo instead of expecting local files.

## iOS Credentials Expo Should Manage

Use the Expo dashboard or `eas credentials --platform ios` to let EAS create or store:

- App Store bundle identifier: `com.triaxis.axxess`
- Apple distribution certificate
- Provisioning profile
- Push key only when push notifications are actually enabled
- App Store Connect API key only when automated EAS Submit is enabled

## Android Credentials Expo Should Manage

Use the Expo dashboard or `eas credentials --platform android` to let EAS create or store:

- Android application ID: `com.triaxis.axxess`
- Android upload keystore
- Google service account key only when automated Play Store submit is enabled

## Commands

From the repository root:

```bash
pnpm mobile:eas:credentials
pnpm mobile:eas:credentials:ios
pnpm mobile:eas:credentials:android
```

From the Expo project directory:

```bash
cd apps/mobile
eas credentials
```

## Never Commit Credential Material

The repository ignores local mobile signing files:

```text
apps/mobile/credentials.json
apps/mobile/*.jks
apps/mobile/*.keystore
apps/mobile/*.p8
apps/mobile/*.p12
apps/mobile/*.cer
apps/mobile/*.mobileprovision
```

Keep signing credentials in Expo, Apple, Google Play, Bitrise, or another managed secret store.

