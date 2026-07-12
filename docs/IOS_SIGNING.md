# iOS Signing

Apple signing must be completed through the Apple Developer account and App Store Connect. This repository does not contain any certificates, provisioning profiles, or private keys. The build will use the following secure values when provided:

- ASC_KEY_ID
- ASC_ISSUER_ID
- ASC_PRIVATE_KEY
- APPLE_TEAM_ID
- IOS_BUNDLE_IDENTIFIER

The bundle identifier should remain com.triaxis.axxess. The release flow should only generate signed artifacts after the App ID, distribution certificate, and provisioning profile are confirmed in the Apple portal.
