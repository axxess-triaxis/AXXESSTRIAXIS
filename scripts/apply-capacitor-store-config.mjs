#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shellRoot = path.join(root, "apps", "mobile-capacitor");

const defaults = {
  androidApplicationId: "com.triaxis.axxess",
  iosBundleIdentifier: "com.triaxis.axxess",
  appVersion: "0.6.0",
  androidVersionCode: "1",
  iosBuildNumber: "1",
};

function envValue(...keys) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filePath, contents) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, contents);
}

function replaceOrWarn(filePath, transforms) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[mobile-store] Skipping missing file: ${path.relative(root, filePath)}`);
    return;
  }

  let source = fs.readFileSync(filePath, "utf8");
  for (const [pattern, replacement] of transforms) {
    source = source.replace(pattern, replacement);
  }
  fs.writeFileSync(filePath, source);
}

function applyAndroid() {
  const buildGradle = path.join(shellRoot, "android", "app", "build.gradle");
  const manifest = path.join(shellRoot, "android", "app", "src", "main", "AndroidManifest.xml");
  const networkSecurityConfig = path.join(
    shellRoot,
    "android",
    "app",
    "src",
    "main",
    "res",
    "xml",
    "network_security_config.xml",
  );

  replaceOrWarn(buildGradle, [
    [/namespace\s+['"][^'"]+['"]/, "namespace resolvedApplicationId"],
    [/compileSdk(?:Version)?\s+(?:rootProject\.ext\.)?\w+/, "compileSdk 36"],
    [/applicationId\s+['"][^'"]+['"]/, "applicationId resolvedApplicationId"],
    [/targetSdk(?:Version)?\s+(?:rootProject\.ext\.)?\w+/, "targetSdk 36"],
    [/versionCode\s+\d+/, "versionCode resolvedVersionCode"],
    [/versionName\s+['"][^'"]+['"]/, "versionName resolvedVersionName"],
  ]);

  if (fs.existsSync(buildGradle)) {
    let source = fs.readFileSync(buildGradle, "utf8");
    if (!source.includes("def resolvedApplicationId")) {
      source = source.replace(
        /plugins\s*\{[\s\S]*?\}\s*/,
        (match) =>
          [
            match.trimEnd(),
            "",
            "def resolvedApplicationId = System.getenv('ANDROID_APPLICATION_ID') ?: 'com.triaxis.axxess'",
            "def resolvedVersionName = System.getenv('RELEASE_APP_VERSION') ?: System.getenv('NEXT_PUBLIC_AXXESS_APP_VERSION') ?: '0.6.0'",
            "def resolvedVersionCode = (System.getenv('ANDROID_VERSION_CODE') ?: System.getenv('EXPO_PUBLIC_ANDROID_VERSION_CODE') ?: '1').toInteger()",
            "",
          ].join("\n"),
      );
    }

    if (!source.includes("signingConfigs")) {
      source = source.replace(
        /(\n\s*buildTypes\s*\{)/,
        [
          "",
          "    signingConfigs {",
          "        release {",
          "            storeFile file(System.getenv('ANDROID_KEYSTORE_FILE') ?: 'release.keystore')",
          "            storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')",
          "            keyAlias System.getenv('ANDROID_KEY_ALIAS')",
          "            keyPassword System.getenv('ANDROID_KEY_PASSWORD')",
          "        }",
          "    }",
          "$1",
        ].join("\n"),
      );
    }

    if (!source.includes("signingConfig signingConfigs.release")) {
      source = source.replace(/release\s*\{\s*/, "release {\n            signingConfig signingConfigs.release\n");
    }

    fs.writeFileSync(buildGradle, source);
  }

  if (fs.existsSync(manifest)) {
    let source = fs.readFileSync(manifest, "utf8");
    source = source.replace(/android:allowBackup="true"/g, 'android:allowBackup="false"');
    source = source.replace(/android:usesCleartextTraffic="true"/g, 'android:usesCleartextTraffic="false"');

    if (!source.includes("android:usesCleartextTraffic=")) {
      source = source.replace(/android:supportsRtl="true"/, 'android:usesCleartextTraffic="false"\n    android:supportsRtl="true"');
    }

    if (!source.includes("android:networkSecurityConfig=")) {
      source = source.replace(
        /android:roundIcon="@mipmap\/ic_launcher_round"/,
        'android:roundIcon="@mipmap/ic_launcher_round"\n    android:networkSecurityConfig="@xml/network_security_config"',
      );
    }

    fs.writeFileSync(manifest, source);
  }

  writeFile(
    networkSecurityConfig,
    [
      '<?xml version="1.0" encoding="utf-8"?>',
      "<network-security-config>",
      '  <base-config cleartextTrafficPermitted="false" />',
      "</network-security-config>",
      "",
    ].join("\n"),
  );
}

function applyIos() {
  const infoPlist = path.join(shellRoot, "ios", "App", "Info.plist");
  const privacyManifest = path.join(shellRoot, "ios", "App", "PrivacyInfo.xcprivacy");
  const exportOptionsPlist = path.join(shellRoot, "ios", "App", "ExportOptions.plist");
  const iosBundleId = envValue("IOS_BUNDLE_IDENTIFIER") || defaults.iosBundleIdentifier;

  writeFile(
    infoPlist,
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
      '<plist version="1.0">',
      "<dict>",
      "  <key>CFBundleDisplayName</key>",
      "  <string>AXXESS TRIaxis</string>",
      "  <key>CFBundleIdentifier</key>",
      "  <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>",
      "  <key>CFBundleShortVersionString</key>",
      "  <string>$(MARKETING_VERSION)</string>",
      "  <key>CFBundleVersion</key>",
      "  <string>$(CURRENT_PROJECT_VERSION)</string>",
      "  <key>ITSAppUsesNonExemptEncryption</key>",
      "  <false/>",
      "  <key>LSApplicationQueriesSchemes</key>",
      "  <array>",
      "    <string>mailto</string>",
      "    <string>tel</string>",
      "  </array>",
      "  <key>CFBundleURLTypes</key>",
      "  <array>",
      "    <dict>",
      "      <key>CFBundleURLName</key>",
      `      <string>${iosBundleId}</string>`,
      "      <key>CFBundleURLSchemes</key>",
      "      <array>",
      "        <string>axxess</string>",
      "      </array>",
      "    </dict>",
      "  </array>",
      "</dict>",
      "</plist>",
      "",
    ].join("\n"),
  );

  writeFile(
    privacyManifest,
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
      '<plist version="1.0">',
      "<dict>",
      "  <key>NSPrivacyTracking</key>",
      "  <false/>",
      "  <key>NSPrivacyTrackingDomains</key>",
      "  <array/>",
      "  <key>NSPrivacyCollectedDataTypes</key>",
      "  <array/>",
      "  <key>NSPrivacyAccessedAPITypes</key>",
      "  <array/>",
      "</dict>",
      "</plist>",
      "",
    ].join("\n"),
  );

  writeFile(
    exportOptionsPlist,
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
      '<plist version="1.0">',
      "<dict>",
      "  <key>method</key>",
      `  <string>${envValue("IOS_EXPORT_METHOD") || "app-store"}</string>`,
      "  <key>destination</key>",
      "  <string>export</string>",
      "  <key>signingStyle</key>",
      "  <string>automatic</string>",
      "  <key>stripSwiftSymbols</key>",
      "  <true/>",
      "  <key>uploadSymbols</key>",
      "  <true/>",
      "  <key>teamID</key>",
      `  <string>${envValue("APPLE_TEAM_ID") || "APPLE_TEAM_ID"}</string>`,
      "</dict>",
      "</plist>",
      "",
    ].join("\n"),
  );
}

applyAndroid();
applyIos();

console.log(
  `[mobile-store] Applied store config for Android ${envValue("ANDROID_APPLICATION_ID") || defaults.androidApplicationId} and iOS ${
    envValue("IOS_BUNDLE_IDENTIFIER") || defaults.iosBundleIdentifier
  }.`,
);
