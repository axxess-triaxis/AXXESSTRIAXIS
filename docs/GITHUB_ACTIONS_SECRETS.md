# GitHub Actions Secrets

Use this checklist in GitHub repository settings before running app build and release workflows.

Path:

```text
GitHub repository > Settings > Secrets and variables > Actions > New repository secret
```

Do not commit actual secret values to this repository. Store production and staging values in GitHub Actions secrets or the relevant deployment provider only.

## App Build And Release Secrets

| Secret name | Value to paste | Required for |
| --- | --- | --- |
| `EXPO_TOKEN` | Expo access token with permission to run EAS builds | EAS Android/iOS builds |
| `EAS_PROJECT_ID` | Expo EAS project ID for the mobile app | EAS Android/iOS builds |
| `ANDROID_KEYSTORE_BASE64` | Base64 contents of the Android keystore file | Android signing |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password | Android signing |
| `ANDROID_KEY_ALIAS` | Keystore alias | Android signing |
| `ANDROID_KEY_PASSWORD` | Key password | Android signing |
| `ASC_KEY_ID` | App Store Connect API key ID | iOS signing |
| `ASC_ISSUER_ID` | App Store Connect issuer ID | iOS signing |
| `ASC_PRIVATE_KEY` | App Store Connect private key contents | iOS signing |
| `APPLE_TEAM_ID` | Apple Developer Team ID | iOS signing |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Web and mobile |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Web and mobile |
| `CAPACITOR_SERVER_URL` | Production or staging web URL, for example `https://app.axxess.dev` | Capacitor shell |
| `CAPACITOR_ALLOWED_HOSTS` | Comma-separated allowed hosts, for example `app.axxess.dev,localhost,127.0.0.1` | Capacitor shell |
| `NEXT_PUBLIC_APP_URL` | Web app URL | Web and mobile |

## Build-Proof Workflow

The first GitHub Actions proof point for mobile release readiness is:

```text
.github/workflows/mobile-eas-production-build.yml
```

Workflow name:

```text
Mobile EAS Production Build Proof
```

It validates the required build/signing secrets, typechecks `apps/mobile`, launches EAS Android/iOS builds, and uploads the EAS build output as a GitHub Actions artifact.

## Encoding Android Keystore

The `ANDROID_KEYSTORE_BASE64` value should be the base64 representation of the release keystore file. Generate it locally from the keystore file, then paste the resulting single-line value into GitHub Actions secrets.

Never paste the binary keystore file contents directly into workflow YAML, repository files, issues, pull requests, or docs.

## App Store Connect Private Key

`ASC_PRIVATE_KEY` should contain the App Store Connect API private key text. Keep the original `.p8` file outside the repository and paste the private key value only into GitHub Actions secrets.

## Public Runtime Values

The names beginning with `NEXT_PUBLIC_` are browser/mobile-exposed values. They are still environment-specific and should be managed centrally so release builds point at the correct Supabase project and web app URL.

## Secret Hygiene

- Use separate values for staging and production where the workflow supports environments.
- Rotate signing and provider credentials after personnel or device changes.
- Do not add service-role keys to mobile build secrets.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` to web or mobile client builds.
- Re-run release workflow validation after changing signing secrets.
