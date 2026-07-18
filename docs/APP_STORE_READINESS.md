# App Store Readiness

AXXESS mobile is configured for TestFlight-ready Capacitor builds through the `Capacitor Mobile Release` GitHub Actions workflow. The workflow exports an `.ipa`, validates it with App Store Connect, and uploads to TestFlight when `IOS_UPLOAD_TO_TESTFLIGHT=true`.

## Required Before TestFlight

- Apple Developer account.
- Bundle identifier: `com.triaxis.axxess`.
- App privacy labels.
- Privacy policy URL.
- Support URL.
- Store screenshots.
- App icon and splash assets.
- Account deletion initiation path.
- Sign in with Apple assessment if Apple OAuth or other social login is enabled.
- `production-mobile` GitHub environment values and Apple/App Store Connect secrets.

## Current Status

- Capacitor/Webnative shell is the primary store-release path.
- iOS bundle identifier, marketing version and build number are environment-driven.
- iOS privacy manifest and export options are committed.
- Release workflow requires an exported `.ipa` for final signoff.
- TestFlight upload is provider-gated by Apple credentials and `IOS_UPLOAD_TO_TESTFLIGHT=true`.
- Final App Review approval still depends on store metadata, screenshots, privacy labels and account-level reviewer setup.
