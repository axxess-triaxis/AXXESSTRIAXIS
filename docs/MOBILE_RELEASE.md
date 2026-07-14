# Mobile Release Foundation

Sprint 12 documents the mobile production path for Expo, TestFlight, Google Play internal testing, and Bitrise.

## Target Channels

- Expo development build.
- TestFlight internal testing.
- Google Play internal testing.
- OTA updates for JS-only changes.

## Required Configuration

- Environment-specific Supabase URL and anon key.
- No service-role key in mobile builds.
- Secure storage for session persistence.
- Crash reporting configured.
- Release channel separation for dev, staging, and production.
- App signing credentials stored in Expo/EAS or Bitrise secrets.
- GitHub Actions release secrets configured when using repository-driven app builds; see `docs/GITHUB_ACTIONS_SECRETS.md`.

## GitHub Actions Release Secrets

Before running app build or release workflows from GitHub Actions, configure the required Android, iOS, Supabase, app URL, and Capacitor shell values in repository secrets.

Canonical checklist:

```text
docs/GITHUB_ACTIONS_SECRETS.md
```

Do not add service-role keys, raw keystore files, App Store Connect `.p8` files, or private signing material to the repository.

## Release Flow

1. Merge approved feature branch.
2. Run web CI and security gates.
3. Run mobile type check and build checks.
4. Generate internal builds.
5. Distribute to TestFlight and Google internal testing.
6. Mark release in PostHog.
7. Monitor crashes, login failures, and API latency.

## OTA Policy

Use OTA only for:

- UI fixes.
- Copy fixes.
- Non-native JS behavior.

Do not use OTA for:

- Native permission changes.
- Auth storage changes.
- SDK upgrades.
- Security-sensitive native changes.

## Store Readiness Gaps

- App privacy labels.
- Data safety declarations.
- Screenshots and metadata.
- Support URL.
- Terms and privacy policy URLs.
- Crash reporting account setup.
- Beta tester group management.
