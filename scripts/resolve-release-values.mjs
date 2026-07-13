#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const eventName = process.env.GITHUB_EVENT_NAME ?? "";
const refName = process.env.GITHUB_REF_NAME ?? "";
const inputAppVersion = (process.env.INPUT_APP_VERSION ?? "").trim();
const inputIosBuildNumber = (process.env.INPUT_IOS_BUILD_NUMBER ?? "").trim();
const inputAndroidVersionCode = (process.env.INPUT_ANDROID_VERSION_CODE ?? "").trim();
const githubEnvFile = process.env.GITHUB_ENV;

function fail(message) {
  console.error(`[release-values] ${message}`);
  process.exit(1);
}

function isPositiveInteger(value) {
  return /^\d+$/.test(value) && Number.parseInt(value, 10) > 0;
}

function readPackageVersion() {
  const packageJsonPath = path.join(root, "package.json");
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  return String(pkg.version ?? "").trim();
}

function parseFromTag(tag) {
  const match = /^v(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)-ios(\d+)-android(\d+)$/.exec(tag);
  if (!match) {
    return null;
  }
  return {
    appVersion: match[1],
    iosBuildNumber: match[2],
    androidVersionCode: match[3],
  };
}

let appVersion;
let iosBuildNumber;
let androidVersionCode;

if (eventName === "workflow_dispatch") {
  appVersion = inputAppVersion || readPackageVersion();
  iosBuildNumber = inputIosBuildNumber;
  androidVersionCode = inputAndroidVersionCode;

  if (!iosBuildNumber || !androidVersionCode) {
    fail("workflow_dispatch requires ios_build_number and android_version_code inputs.");
  }
} else if (eventName === "push") {
  const parsed = parseFromTag(refName);
  if (!parsed) {
    fail("tag releases must use format vX.Y.Z-ios<build>-android<code>, e.g. v0.9.1-ios42-android42.");
  }
  appVersion = parsed.appVersion;
  iosBuildNumber = parsed.iosBuildNumber;
  androidVersionCode = parsed.androidVersionCode;
} else {
  fail(`unsupported event '${eventName}'.`);
}

if (!/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(appVersion)) {
  fail(`invalid app version '${appVersion}'.`);
}

if (!isPositiveInteger(iosBuildNumber)) {
  fail(`invalid iOS build number '${iosBuildNumber}'. Must be a positive integer.`);
}

if (!isPositiveInteger(androidVersionCode)) {
  fail(`invalid Android version code '${androidVersionCode}'. Must be a positive integer.`);
}

if (!githubEnvFile) {
  fail("GITHUB_ENV is not available.");
}

fs.appendFileSync(githubEnvFile, `NEXT_PUBLIC_AXXESS_APP_VERSION=${appVersion}\n`);
fs.appendFileSync(githubEnvFile, `EXPO_PUBLIC_AXXESS_APP_VERSION=${appVersion}\n`);
fs.appendFileSync(githubEnvFile, `EXPO_PUBLIC_IOS_BUILD_NUMBER=${iosBuildNumber}\n`);
fs.appendFileSync(githubEnvFile, `EXPO_PUBLIC_ANDROID_VERSION_CODE=${androidVersionCode}\n`);

console.log(`[release-values] app=${appVersion} ios=${iosBuildNumber} android=${androidVersionCode}`);
