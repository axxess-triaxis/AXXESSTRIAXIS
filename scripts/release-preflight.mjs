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

if (!["ci", "release"].includes(mode)) {
  console.error(`[preflight] Invalid mode '${mode}'. Use --mode=ci or --mode=release.`);
  process.exit(1);
}

if (!["all", "web", "android", "ios"].includes(target)) {
  console.error(`[preflight] Invalid target '${target}'. Use --target=all|web|android|ios.`);
  process.exit(1);
}

function readJson(relativePath) {
  const absolutePath = path.join(root, relativePath);
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function validateVersion() {
  const pkg = readJson("package.json");
  const semverLike = /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/;
  if (!semverLike.test(pkg.version ?? "")) {
    throw new Error(`package.json version '${pkg.version}' is not release-safe semver.`);
  }

  const expoConfig = fs.readFileSync(path.join(root, "apps", "mobile", "app.config.ts"), "utf8");
  const hasIosBuildControl = expoConfig.includes("EXPO_PUBLIC_IOS_BUILD_NUMBER") || expoConfig.includes("IOS_BUILD_NUMBER");
  const hasAndroidVersionControl = expoConfig.includes("EXPO_PUBLIC_ANDROID_VERSION_CODE") || expoConfig.includes("ANDROID_VERSION_CODE");

  if (!hasIosBuildControl || !hasAndroidVersionControl) {
    throw new Error("apps/mobile/app.config.ts must support environment-driven iOS build number and Android version code.");
  }
}

function requireEnv(keys, strict) {
  const missing = keys.filter((key) => !(process.env[key] ?? "").trim());
  if (missing.length === 0) {
    return;
  }

  const message = `[preflight] Missing ${strict ? "required" : "optional"} env vars: ${missing.join(", ")}`;
  if (strict) {
    throw new Error(message);
  }
  console.warn(message);
}

function validatePositiveIntegerEnv(key) {
  const raw = (process.env[key] ?? "").trim();
  if (!/^\d+$/.test(raw) || Number.parseInt(raw, 10) < 1) {
    throw new Error(`${key} must be a positive integer.`);
  }
}

function validateSharedDeploymentConfig() {
  const shared = fs.readFileSync(path.join(root, "packages", "shared", "src", "index.ts"), "utf8");
  if (!shared.includes("twoFactorAuthEnabled: true")) {
    throw new Error("Shared auth config must keep 2FA enabled for production readiness.");
  }

  const pluginMatches = shared.match(/name:\s*"[^"]+"/g) ?? [];
  if (pluginMatches.length < 10) {
    throw new Error("Shared productivity plugin catalog must include at least 10 plugins.");
  }
}

try {
  validateVersion();
  validateSharedDeploymentConfig();

  const baseEnv = [
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "EXPO_PUBLIC_APP_URL",
    "EXPO_PUBLIC_SUPABASE_URL",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    "CAPACITOR_SERVER_URL",
    "CAPACITOR_ALLOWED_HOSTS",
  ];

  const androidEnv = [
    "ANDROID_APPLICATION_ID",
    "EXPO_PUBLIC_ANDROID_VERSION_CODE",
    "ANDROID_KEYSTORE_BASE64",
    "ANDROID_KEYSTORE_PASSWORD",
    "ANDROID_KEY_ALIAS",
    "ANDROID_KEY_PASSWORD",
  ];

  const iosEnv = [
    "IOS_BUNDLE_IDENTIFIER",
    "EXPO_PUBLIC_IOS_BUILD_NUMBER",
    "APPLE_TEAM_ID",
    "ASC_KEY_ID",
    "ASC_ISSUER_ID",
    "ASC_PRIVATE_KEY",
  ];

  const strict = mode === "release";

  if (target === "all" || target === "web") {
    requireEnv(baseEnv, strict);
  }

  if (target === "all" || target === "android") {
    requireEnv(baseEnv.concat(androidEnv), strict);
    if (strict) validatePositiveIntegerEnv("EXPO_PUBLIC_ANDROID_VERSION_CODE");
  }

  if (target === "all" || target === "ios") {
    requireEnv(baseEnv.concat(iosEnv), strict);
    if (strict) validatePositiveIntegerEnv("EXPO_PUBLIC_IOS_BUILD_NUMBER");
  }

  console.log(`[preflight] OK mode=${mode} target=${target}`);
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown preflight failure.";
  console.error(`[preflight] FAILED: ${message}`);
  process.exit(1);
}
