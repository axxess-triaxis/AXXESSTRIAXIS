#!/usr/bin/env node
import { execFileSync } from "node:child_process";
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

function readOptional(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      console.warn(`[mobile-store] Skipping missing file: ${path.relative(root, filePath)}`);
      return null;
    }
    throw error;
  }
}

function replaceOrWarn(filePath, transforms) {
  let source = readOptional(filePath);
  if (source === null) {
    return;
  }

  for (const [pattern, replacement] of transforms) {
    source = source.replace(pattern, replacement);
  }
  fs.writeFileSync(filePath, source);
}

// 2026-08-30: `cap add ios` scaffolds a fresh Xcode project every CI run (App.xcodeproj is never
// committed -- see this repo's .gitignore), and neither `cap sync`/`cap build` nor anything else
// in this pipeline ever replaced that scaffold's own AppIcon.appiconset with the real AXXESS logo
// already sitting at resources/icon.png. A prior audit doc
// (CODEBASE_DEBLOAT_SPRINT2_EVIDENCE_ARTIFACT_AUDIT_2026_08_12.md) claimed "Capacitor's build
// tooling (cap sync/cap build) reads this exact path directly to generate every platform-specific
// app icon size" -- confirmed false by direct inspection: a fresh `cap add ios` scaffold's
// AppIcon.appiconset contains exactly one file, Capacitor's own generic default template icon
// (a blue chevron/X mark), not anything derived from resources/icon.png. Apple's App Store
// Connect/TestFlight extract the app icon directly from the shipped .ipa's own AppIcon.appiconset
// -- unlike Google Play, there is no separate "upload your listing icon" field to paper over this
// -- so a build carrying Capacitor's stock icon is a real, plausible explanation for a Beta App
// Review rejection. Fixed by generating the real icon via @capacitor/assets (the actual official
// tool for this, newly added as a devDependency -- plain `cap sync`/`cap build` never had this
// capability on their own).
function generateIosAppIcon() {
  const iosProjectDir = path.join(shellRoot, "ios", "App");
  const xcodeprojMarker = path.join(iosProjectDir, "App.xcodeproj", "project.pbxproj");
  const iconSource = path.join(shellRoot, "resources", "icon.png");

  if (!fs.existsSync(xcodeprojMarker)) {
    console.warn("[mobile-store] Skipping iOS app icon generation: no Xcode project yet (run `cap add ios` first).");
    return;
  }
  if (!fs.existsSync(iconSource)) {
    console.warn("[mobile-store] Skipping iOS app icon generation: resources/icon.png not found.");
    return;
  }

  // Scoped to the app icon only. resources/splash.png is a byte-for-byte duplicate of icon.png,
  // well below Apple's recommended 2732x2732 splash-screen minimum, and was never reviewed as an
  // actual splash design -- @capacitor/assets' `generate --ios` regenerates both the icon and the
  // splash screen in one pass with no icon-only flag, so Capacitor's own scaffolded splash screen
  // is snapshotted here and restored afterward, leaving it exactly as `cap add ios` produced it.
  const splashImagesetDir = path.join(iosProjectDir, "App", "Assets.xcassets", "Splash.imageset");
  const splashBackupDir = `${splashImagesetDir}.pre-icon-generate-backup`;
  const hadExistingSplash = fs.existsSync(splashImagesetDir);
  if (hadExistingSplash) {
    fs.rmSync(splashBackupDir, { recursive: true, force: true });
    fs.cpSync(splashImagesetDir, splashBackupDir, { recursive: true });
  }

  // Invoke the package's own JS entry point directly via `node` rather than the node_modules/.bin
  // shim -- the .bin/capacitor-assets.cmd shim on Windows can't be spawned by execFileSync without
  // shell:true, which then breaks on this repo's own path (spaces in "Sudipta Sarmah") and is a
  // real, documented Node security footgun (unescaped shell concatenation) besides. The shim is
  // just `#!/usr/bin/env node` + a plain script either way, so calling `node <that script>`
  // directly is both simpler and safer, and works identically on the iOS release job's actual
  // macOS (darwin-arm64) CI runner.
  const capacitorAssetsEntry = path.join(shellRoot, "node_modules", "@capacitor", "assets", "bin", "capacitor-assets");

  try {
    execFileSync(process.execPath, [capacitorAssetsEntry, "generate", "--ios"], { cwd: shellRoot, stdio: "inherit" });
  } catch (error) {
    // 2026-09-02: this used to warn and return, letting the release continue and ship with
    // Capacitor's own generic default icon still in place -- which is exactly what happened on a
    // real release run (0.7.0 build 2: sharp's darwin-arm64 binary was missing from the lockfile,
    // see pnpm-workspace.yaml's supportedArchitectures comment for that root cause), and that
    // broken-icon build still got uploaded to Apple's Beta App Review, wasting a real review
    // cycle. The whole point of this function is to guarantee a real icon ships; a failure here
    // must fail the release, not silently degrade to the exact bug this function exists to fix.
    if (hadExistingSplash) {
      fs.rmSync(splashImagesetDir, { recursive: true, force: true });
      fs.renameSync(splashBackupDir, splashImagesetDir);
    }
    throw new Error(`[mobile-store] iOS app icon generation failed -- refusing to ship a release with Capacitor's default icon: ${error.message}`);
  }

  if (hadExistingSplash) {
    fs.rmSync(splashImagesetDir, { recursive: true, force: true });
    fs.renameSync(splashBackupDir, splashImagesetDir);
  }

  console.log("[mobile-store] Generated iOS app icon from resources/icon.png (splash screen left untouched).");
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
    [/namespace\s*=?\s*['"][^'"]+['"]/, "namespace resolvedApplicationId"],
    [/compileSdk(?:Version)?\s*=?\s*(?:rootProject\.ext\.\w+|\d+)/, "compileSdk 36"],
    [/applicationId\s*=?\s*['"][^'"]+['"]/, "applicationId resolvedApplicationId"],
    [/targetSdk(?:Version)?\s*=?\s*(?:rootProject\.ext\.\w+|\d+)/, "targetSdk 36"],
    [/versionCode\s*=?\s*\d+/, "versionCode resolvedVersionCode"],
    [/versionName\s*=?\s*['"][^'"]+['"]/, "versionName resolvedVersionName"],
  ]);

  const buildGradleSource = readOptional(buildGradle);
  if (buildGradleSource !== null) {
    let source = buildGradleSource;
    if (!source.includes("def resolvedApplicationId")) {
      const applyPluginAnchor = /apply\s+plugin:\s*['"]com\.android\.application['"]\s*\n?/;
      const pluginsBlockAnchor = /plugins\s*\{[\s\S]*?\}\s*\n?/;
      const anchor = applyPluginAnchor.test(source) ? applyPluginAnchor : pluginsBlockAnchor;
      source = source.replace(
        anchor,
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
      source = source.replace(/(buildTypes\s*\{\s*release\s*\{)/, "$1\n            signingConfig signingConfigs.release");
    }

    fs.writeFileSync(buildGradle, source);
  }

  const manifestSource = readOptional(manifest);
  if (manifestSource !== null) {
    let source = manifestSource;
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

  // 2026-08-27: three failed manual-signing iterations, reverted back to "automatic" -- the
  // named provisioning profile manual signing pinned to was tied to a certificate whose private
  // key only ever existed on a local developer machine (generated via OpenSSL, outside any Apple
  // system), never reachable by CI. See build-ios.mjs's own comment on the archive step's
  // CODE_SIGN_STYLE for the full account. Automatic and manual must not be mixed across the
  // archive and export steps of the same release, so this reverts alongside that change.
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
generateIosAppIcon();

console.log(
  `[mobile-store] Applied store config for Android ${envValue("ANDROID_APPLICATION_ID") || defaults.androidApplicationId} and iOS ${
    envValue("IOS_BUNDLE_IDENTIFIER") || defaults.iosBundleIdentifier
  }.`,
);
