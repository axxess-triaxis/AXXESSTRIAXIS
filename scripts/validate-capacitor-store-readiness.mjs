#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);

function argValue(name, fallback) {
  const prefix = `${name}=`;
  const hit = args.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const mode = argValue("--mode", "ci");
const target = argValue("--target", "all");
const strict = mode === "release";
const failures = [];
const warnings = [];

if (!["ci", "release"].includes(mode)) {
  failures.push(`Invalid mode '${mode}'. Use --mode=ci or --mode=release.`);
}

if (!["all", "android", "ios"].includes(target)) {
  failures.push(`Invalid target '${target}'. Use --target=all|android|ios.`);
}

function rel(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, "/");
}

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing required file: ${rel(filePath)}`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function warn(condition, message) {
  if (!condition) warnings.push(message);
}

function env(key) {
  return (process.env[key] ?? "").trim();
}

function requireEnv(keys) {
  for (const key of keys) {
    expect(Boolean(env(key)), `Missing required release environment value: ${key}`);
  }
}

function validatePositiveInteger(keys, label) {
  const value = keys.map((key) => env(key)).find(Boolean);
  expect(Boolean(value), `${label} is required.`);
  if (value) {
    expect(/^\d+$/.test(value) && Number.parseInt(value, 10) > 0, `${label} must be a positive integer.`);
  }
}

function validateHttpsServer() {
  const serverUrl = env("CAPACITOR_SERVER_URL") || env("NEXT_PUBLIC_APP_URL");
  if (!serverUrl) {
    if (strict) failures.push("CAPACITOR_SERVER_URL or NEXT_PUBLIC_APP_URL is required for store release.");
    return;
  }

  try {
    const parsed = new URL(serverUrl);
    expect(parsed.protocol === "https:", "Capacitor store releases must point at an HTTPS web runtime.");
    expect(!["localhost", "127.0.0.1", "::1"].includes(parsed.hostname), "Capacitor store releases cannot point at localhost.");
    const allowedHosts = (env("CAPACITOR_ALLOWED_HOSTS") || "")
      .split(",")
      .map((host) => host.trim())
      .filter(Boolean);
    warn(allowedHosts.includes(parsed.hostname), `CAPACITOR_ALLOWED_HOSTS should include ${parsed.hostname}.`);
  } catch {
    failures.push(`Invalid Capacitor server URL: ${serverUrl}`);
  }
}

function validateAndroid() {
  const buildGradle = read(path.join(root, "apps", "mobile-capacitor", "android", "app", "build.gradle"));
  const manifest = read(path.join(root, "apps", "mobile-capacitor", "android", "app", "src", "main", "AndroidManifest.xml"));
  const buildAndroid = read(path.join(root, "apps", "mobile-capacitor", "scripts", "build-android.mjs"));
  const workflow = read(path.join(root, ".github", "workflows", "mobile-capacitor-release.yml"));
  const networkSecurityConfig = path.join(
    root,
    "apps",
    "mobile-capacitor",
    "android",
    "app",
    "src",
    "main",
    "res",
    "xml",
    "network_security_config.xml",
  );

  expect(/compileSdk\s+36/.test(buildGradle), "Android compileSdk must be 36 for current Play policy.");
  expect(/targetSdk\s+36/.test(buildGradle), "Android targetSdk must be 36 for current Play policy.");
  expect(buildGradle.includes("ANDROID_APPLICATION_ID"), "Android applicationId must be environment-driven.");
  expect(buildGradle.includes("ANDROID_VERSION_CODE"), "Android versionCode must be release-input driven.");
  expect(buildGradle.includes("RELEASE_APP_VERSION"), "Android versionName must be release-input driven.");
  expect(buildGradle.includes("signingConfig signingConfigs.release"), "Android release build must use release signing config.");
  expect(manifest.includes('android:allowBackup="false"'), "Android manifest must disable backup for enterprise release.");
  expect(manifest.includes('android:usesCleartextTraffic="false"'), "Android manifest must disable cleartext traffic.");
  expect(fs.existsSync(networkSecurityConfig), "Android network security config must exist.");
  expect(buildAndroid.includes("--store"), "Android build script must support strict store mode.");
  expect(buildAndroid.includes("bundleRelease"), "Android store build must produce an AAB via bundleRelease.");
  expect(workflow.includes("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"), "Release workflow must support Google Play service account upload.");

  if (strict) {
    requireEnv([
      "ANDROID_APPLICATION_ID",
      "ANDROID_KEYSTORE_BASE64",
      "ANDROID_KEYSTORE_PASSWORD",
      "ANDROID_KEY_ALIAS",
      "ANDROID_KEY_PASSWORD",
    ]);
    validatePositiveInteger(["ANDROID_VERSION_CODE", "EXPO_PUBLIC_ANDROID_VERSION_CODE"], "Android version code");
  }
}

function validateIos() {
  const infoPlist = read(path.join(root, "apps", "mobile-capacitor", "ios", "App", "Info.plist"));
  const buildIos = read(path.join(root, "apps", "mobile-capacitor", "scripts", "build-ios.mjs"));
  const workflow = read(path.join(root, ".github", "workflows", "mobile-capacitor-release.yml"));
  const privacyManifest = path.join(root, "apps", "mobile-capacitor", "ios", "App", "PrivacyInfo.xcprivacy");
  const exportOptions = path.join(root, "apps", "mobile-capacitor", "ios", "App", "ExportOptions.plist");

  expect(infoPlist.includes("$(PRODUCT_BUNDLE_IDENTIFIER)"), "iOS bundle identifier must come from release build settings.");
  expect(infoPlist.includes("$(MARKETING_VERSION)"), "iOS marketing version must come from release build settings.");
  expect(infoPlist.includes("$(CURRENT_PROJECT_VERSION)"), "iOS build number must come from release build settings.");
  expect(infoPlist.includes("CFBundleURLSchemes"), "iOS deep link schemes must be declared as a URL type dictionary.");
  expect(fs.existsSync(privacyManifest), "iOS privacy manifest must exist.");
  expect(fs.existsSync(exportOptions), "iOS ExportOptions.plist must exist for IPA export.");
  expect(buildIos.includes("-exportArchive"), "iOS build script must export an IPA.");
  expect(buildIos.includes("--upload-app"), "iOS build script must support TestFlight upload.");
  expect(workflow.includes("IOS_UPLOAD_TO_TESTFLIGHT"), "Release workflow must support TestFlight upload gating.");
  expect(workflow.includes('name "*.ipa"'), "Release signoff must require an IPA artifact.");

  if (strict) {
    requireEnv(["IOS_BUNDLE_IDENTIFIER", "APPLE_TEAM_ID", "ASC_KEY_ID", "ASC_ISSUER_ID", "ASC_PRIVATE_KEY"]);
    validatePositiveInteger(["IOS_BUILD_NUMBER", "EXPO_PUBLIC_IOS_BUILD_NUMBER"], "iOS build number");
  }
}

validateHttpsServer();

if (target === "all" || target === "android") {
  validateAndroid();
}

if (target === "all" || target === "ios") {
  validateIos();
}

if (warnings.length > 0) {
  for (const message of warnings) {
    console.warn(`[mobile-store] WARN: ${message}`);
  }
}

if (failures.length > 0) {
  for (const message of failures) {
    console.error(`[mobile-store] FAIL: ${message}`);
  }
  process.exit(1);
}

console.log(`[mobile-store] Store readiness checks passed mode=${mode} target=${target}`);
