# Android Signing

Android signing is configured through secure environment variables and should not be committed to the repository. The release flow expects the following values to be supplied through GitHub Secrets, Webnative secrets, or a secure build environment:

- ANDROID_KEYSTORE_BASE64
- ANDROID_KEYSTORE_PASSWORD
- ANDROID_KEY_ALIAS
- ANDROID_KEY_PASSWORD

The production release build should generate an AAB and an internal/testing APK. The repository stores the build metadata in apps/mobile-capacitor/build-metadata/build-metadata.json after each run.

## Required founder actions

1. Create or retrieve the Android keystore in the secure Webnative credential environment.
2. Upload the keystore reference and passwords to the secure secret store.
3. Confirm the Play Console service account and package ownership for com.triaxis.axxess.
4. Verify SHA-1 and SHA-256 fingerprints for Google Sign-In and Firebase integration.
