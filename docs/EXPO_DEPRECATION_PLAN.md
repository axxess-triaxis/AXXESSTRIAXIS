# Expo/EAS Deprecation Plan

Expo and EAS are retained as optional build infrastructure while AXXESS introduces a free Android beta pipeline through GitHub Actions and Firebase App Distribution.

## Current Position

- Do not remove `apps/mobile/eas.json`.
- Do not remove existing EAS scripts yet.
- Use GitHub Actions Android beta builds for routine free tester artifacts where possible.
- Use EAS only when Expo-managed credentials, store builds, or hosted Expo workflows are specifically required.

## Why EAS Is Optional

The mobile app can now produce Android beta APK artifacts from GitHub Actions Linux runners. This reduces dependency on paid or quota-limited hosted mobile build services for early Android beta testing.

## Deferred iOS Plan

iOS builds remain manual/deferred until one of these is available:

- Local Mac access
- Free macOS GitHub Actions minutes
- Sponsorship or credits
- Paid CI with Apple signing credentials

## Removal Criteria

Consider removing EAS only after:

1. Android Firebase distribution has been stable across repeated releases.
2. A separate iOS build strategy is approved.
3. Store release needs are covered without EAS.
4. Release documentation no longer references EAS as a required path.
