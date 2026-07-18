# Play Store Readiness

AXXESS mobile is configured for Android internal testing through the Capacitor release workflow on GitHub Actions. Expo/EAS remains available for legacy compatibility, but the primary store-bound lane now produces a signed Play-ready `.aab`.

## Required Before Internal Testing

- Google Play developer account.
- Android package: `com.triaxis.axxess`.
- Privacy policy URL.
- Data Safety form.
- Content rating.
- App icon and screenshots.
- Android signing setup.
- `production-mobile` GitHub environment values and Android keystore secrets.
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` and `ANDROID_UPLOAD_TO_PLAY=true` when automated Play upload is desired.

## Current Status

- Capacitor/Webnative shell is the primary store-release path.
- Android package, version code and version name are environment-driven.
- Android compile SDK and target SDK are set to API 36.
- Release workflow builds a signed `.aab` when keystore secrets are configured.
- Final signoff rejects missing or placeholder Android artifacts.
- Google Play internal testing upload is optional and gated by explicit repository variables/secrets.
