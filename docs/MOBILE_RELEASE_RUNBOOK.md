# Mobile Release Runbook

## Triggering builds

- Every push to main that changes relevant mobile/web files triggers the Capacitor workflow.
- Pull requests trigger validation only.
- Manual builds can be triggered with the GitHub Actions workflow dispatch UI.

## Disabling automatic builds

Disable or remove the workflow file or use repository settings to pause GitHub Actions for this workflow.

## Rotating credentials

- Rotate Android signing credentials by replacing the secure keystore reference and passwords in the secret store.
- Rotate Apple credentials by replacing the App Store Connect API key and provisioning assets in the secure store.

## Publishing

- Android preview artifacts can be distributed through Firebase or Play Internal Testing after the credentials are configured.
- iOS builds can be uploaded to TestFlight after the App Store Connect credentials are configured.

## Rollback

- Revert the release tag or Git commit, then re-run the workflow for the prior known-good version.
- Keep the last successful build artifact and metadata for rollback.
