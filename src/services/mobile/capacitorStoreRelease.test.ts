import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("Capacitor store release readiness", () => {
  it("keeps Android configured for signed Play Store bundles", () => {
    const buildGradle = read("apps/mobile-capacitor/android/app/build.gradle");
    const manifest = read("apps/mobile-capacitor/android/app/src/main/AndroidManifest.xml");

    expect(buildGradle).toContain("compileSdk 36");
    expect(buildGradle).toContain("targetSdk 36");
    expect(buildGradle).toContain("ANDROID_APPLICATION_ID");
    expect(buildGradle).toContain("ANDROID_VERSION_CODE");
    expect(buildGradle).toContain("RELEASE_APP_VERSION");
    expect(buildGradle).toContain("signingConfig signingConfigs.release");
    expect(manifest).toContain('android:allowBackup="false"');
    expect(manifest).toContain('android:usesCleartextTraffic="false"');
    expect(fs.existsSync(path.join(root, "apps/mobile-capacitor/android/app/src/main/res/xml/network_security_config.xml"))).toBe(true);
  });

  it("keeps iOS configured for exported TestFlight IPAs", () => {
    const infoPlist = read("apps/mobile-capacitor/ios/App/Info.plist");
    const buildIos = read("apps/mobile-capacitor/scripts/build-ios.mjs");

    expect(infoPlist).toContain("$(PRODUCT_BUNDLE_IDENTIFIER)");
    expect(infoPlist).toContain("$(MARKETING_VERSION)");
    expect(infoPlist).toContain("$(CURRENT_PROJECT_VERSION)");
    expect(infoPlist).toContain("CFBundleURLSchemes");
    expect(fs.existsSync(path.join(root, "apps/mobile-capacitor/ios/App/PrivacyInfo.xcprivacy"))).toBe(true);
    expect(fs.existsSync(path.join(root, "apps/mobile-capacitor/ios/App/ExportOptions.plist"))).toBe(true);
    expect(buildIos).toContain("-exportArchive");
    expect(buildIos).toContain("--upload-app");
  });

  it("requires store artifacts and optional store upload gates in the release workflow", () => {
    const workflow = read(".github/workflows/mobile-capacitor-release.yml");

    expect(workflow).toContain("Capacitor store readiness (strict)");
    expect(workflow).toContain("r0adkll/upload-google-play@v1");
    expect(workflow).toContain("IOS_UPLOAD_TO_TESTFLIGHT");
    expect(workflow).toContain('find artifacts/ios -type f -name "*.ipa"');
    expect(workflow).not.toContain('name "*.ipa" -o -type d -name "*.xcarchive"');
  });
});
