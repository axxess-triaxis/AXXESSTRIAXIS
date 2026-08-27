import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const argsFromCli = process.argv.slice(2);
const storeRelease = argsFromCli.includes("--store") || process.env.STORE_RELEASE === "true" || process.env.MOBILE_RELEASE_MODE === "store";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const shellRoot = path.resolve(scriptDir, "..");
const iosDir = path.join(shellRoot, "ios", "App");
const workspace = path.join(iosDir, "App.xcworkspace");
const project = path.join(iosDir, "App.xcodeproj");
const buildDir = path.join(iosDir, "build");
const archivePath = path.join(buildDir, "App.xcarchive");
const exportPath = path.join(buildDir, "export");
const exportOptionsPlist = path.join(iosDir, "ExportOptions.plist");

if (process.platform !== "darwin") {
  if (storeRelease) {
    console.error("[mobile] iOS store releases require a macOS runner with Xcode.");
    process.exit(1);
  }
  console.log("[mobile] iOS builds require macOS; skipping local iOS artifact build on this runner.");
  process.exit(0);
}

if (!fs.existsSync(workspace) && !fs.existsSync(project)) {
  console.error("[mobile] iOS project is missing. Run `cap add ios` before building.");
  process.exit(1);
}

fs.mkdirSync(buildDir, { recursive: true });
fs.mkdirSync(exportPath, { recursive: true });

const hasSigning = ["APPLE_TEAM_ID", "ASC_KEY_ID", "ASC_ISSUER_ID", "ASC_PRIVATE_KEY", "IOS_BUNDLE_IDENTIFIER"].every((key) =>
  Boolean(process.env[key]),
);

const appVersion = process.env.RELEASE_APP_VERSION || process.env.NEXT_PUBLIC_AXXESS_APP_VERSION || "0.6.0";
const iosBuildNumber = process.env.IOS_BUILD_NUMBER || process.env.EXPO_PUBLIC_IOS_BUILD_NUMBER || "1";

if (storeRelease && !hasSigning) {
  console.error("[mobile] iOS store release requires APPLE_TEAM_ID, IOS_BUNDLE_IDENTIFIER, ASC_KEY_ID, ASC_ISSUER_ID, and ASC_PRIVATE_KEY.");
  process.exit(1);
}

const baseArgs = fs.existsSync(workspace)
  ? ["-workspace", workspace, "-scheme", "App"]
  : ["-project", project, "-scheme", "App"];

function writeAppStoreConnectKey() {
  const keyId = process.env.ASC_KEY_ID;
  const key = process.env.ASC_PRIVATE_KEY;
  if (!keyId || !key) {
    return "";
  }

  const privateKeyDir = path.join(os.homedir(), ".appstoreconnect", "private_keys");
  fs.mkdirSync(privateKeyDir, { recursive: true, mode: 0o700 });
  const keyPath = path.join(privateKeyDir, `AuthKey_${keyId}.p8`);
  const normalizedKey = key.includes("\\n") ? key.replaceAll("\\n", "\n") : key;
  fs.writeFileSync(keyPath, normalizedKey.endsWith("\n") ? normalizedKey : `${normalizedKey}\n`, { mode: 0o600 });
  return keyPath;
}

function authArgs(keyPath) {
  if (!keyPath || !process.env.ASC_KEY_ID || !process.env.ASC_ISSUER_ID) {
    return [];
  }

  return [
    "-authenticationKeyID",
    process.env.ASC_KEY_ID,
    "-authenticationKeyIssuerID",
    process.env.ASC_ISSUER_ID,
    "-authenticationKeyPath",
    keyPath,
  ];
}

const keyPath = writeAppStoreConnectKey();

// 2026-08-27, second iteration: CODE_SIGN_STYLE=Automatic + CODE_SIGN_IDENTITY=Apple Distribution
// (the first attempted fix) failed live in CI with "App has conflicting provisioning settings.
// App is automatically signed for development, but a conflicting code signing identity Apple
// Distribution has been manually specified." -- confirming `xcodebuild archive` with pure
// Automatic signing on this account resolves to a Development-anchored provisioning state that a
// bare identity override cannot redirect; Apple's own suggested fix is exactly this: switch to
// manual signing with an explicit profile. `AXXESS TRIaxis` is the App Store distribution profile
// created for `com.triaxis.axxess` in the Developer Portal (Certificates, Identifiers & Profiles ->
// Profiles) using the Apple Distribution certificate created the same day -- override via
// IOS_PROVISIONING_PROFILE_SPECIFIER if that profile is ever renamed or regenerated under a
// different name.
const provisioningProfileSpecifier = process.env.IOS_PROVISIONING_PROFILE_SPECIFIER || "AXXESS TRIaxis";

const archiveArgs = hasSigning
  ? [
      ...baseArgs,
      "-configuration",
      "Release",
      "-archivePath",
      archivePath,
      "-destination",
      "generic/platform=iOS",
      "-allowProvisioningUpdates",
      ...authArgs(keyPath),
      `DEVELOPMENT_TEAM=${process.env.APPLE_TEAM_ID}`,
      `PRODUCT_BUNDLE_IDENTIFIER=${process.env.IOS_BUNDLE_IDENTIFIER}`,
      `MARKETING_VERSION=${appVersion}`,
      `CURRENT_PROJECT_VERSION=${iosBuildNumber}`,
      "CODE_SIGN_STYLE=Manual",
      `PROVISIONING_PROFILE_SPECIFIER=${provisioningProfileSpecifier}`,
      // 2026-08-27, third iteration: "Apple Distribution" (the second attempted fix) failed live
      // in CI with "No signing certificate 'iOS Distribution' found... with a private key" --
      // Xcode's own signing-identity matching for this project resolves against the legacy
      // "iOS Distribution" alias, not the newer universal "Apple Distribution" name, regardless of
      // which type label the certificate shows as in the Developer Portal. "iPhone Distribution"
      // is the long-established, documented CODE_SIGN_IDENTITY value CI pipelines use for App
      // Store archives for exactly this reason (Apple Developer Forums threads 690763, 713276) --
      // Xcode matches it as a prefix/alias against any valid distribution certificate regardless
      // of the certificate's own display type.
      "CODE_SIGN_IDENTITY=iPhone Distribution",
      "archive",
    ]
  : [
      ...baseArgs,
      "-configuration",
      "Debug",
      "-sdk",
      "iphonesimulator",
      "-derivedDataPath",
      buildDir,
      "CODE_SIGNING_ALLOWED=NO",
    ];

console.log(`[mobile] Building iOS ${hasSigning ? "signed store archive" : "simulator preview"} artifact.`);

const archiveResult = spawnSync("xcodebuild", archiveArgs, {
  cwd: iosDir,
  stdio: "inherit",
});

if ((archiveResult.status ?? 1) !== 0) {
  process.exit(archiveResult.status ?? 1);
}

if (!storeRelease) {
  process.exit(0);
}

const exportResult = spawnSync(
  "xcodebuild",
  [
    "-exportArchive",
    "-archivePath",
    archivePath,
    "-exportPath",
    exportPath,
    "-exportOptionsPlist",
    exportOptionsPlist,
    "-allowProvisioningUpdates",
    ...authArgs(keyPath),
  ],
  {
    cwd: iosDir,
    stdio: "inherit",
  },
);

if ((exportResult.status ?? 1) !== 0) {
  process.exit(exportResult.status ?? 1);
}

const ipaFile = fs.readdirSync(exportPath).find((file) => file.endsWith(".ipa"));
if (!ipaFile) {
  console.error("[mobile] iOS store release did not export an .ipa artifact.");
  process.exit(1);
}

const ipaPath = path.join(exportPath, ipaFile);
const shouldValidate = process.env.IOS_VALIDATE_UPLOAD !== "false";
const shouldUpload = process.env.IOS_UPLOAD_TO_TESTFLIGHT === "true";

if (shouldValidate || shouldUpload) {
  const altoolArgs = [
    shouldUpload ? "--upload-app" : "--validate-app",
    "-f",
    ipaPath,
    "-t",
    "ios",
    "--apiKey",
    process.env.ASC_KEY_ID,
    "--apiIssuer",
    process.env.ASC_ISSUER_ID,
  ];

  console.log(`[mobile] ${shouldUpload ? "Uploading" : "Validating"} iOS IPA with App Store Connect.`);
  const altoolResult = spawnSync("xcrun", ["altool", ...altoolArgs], {
    cwd: iosDir,
    stdio: "inherit",
  });

  if ((altoolResult.status ?? 1) !== 0) {
    process.exit(altoolResult.status ?? 1);
  }
}

console.log(`[mobile] iOS IPA ready: ${ipaPath}`);
process.exit(0);
