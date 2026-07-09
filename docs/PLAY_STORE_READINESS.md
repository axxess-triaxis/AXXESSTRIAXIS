# Play Store Readiness

AXXESS mobile is configured for Android internal testing through Expo/EAS or Bitrise.

## Required Before Internal Testing

- Google Play developer account.
- Android package: `com.triaxis.axxess`.
- Privacy policy URL.
- Data Safety form.
- Content rating.
- App icon and screenshots.
- Android signing setup.

## Current Status

- Android preview EAS profile produces APK.
- Bitrise Android workflow runs Expo prebuild and Gradle release APK.
- No unnecessary permissions are requested in `app.config.ts`.
