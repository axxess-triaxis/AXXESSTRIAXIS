import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const storeRelease = args.includes("--store") || process.env.STORE_RELEASE === "true" || process.env.MOBILE_RELEASE_MODE === "store";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const shellRoot = path.resolve(scriptDir, "..");
const androidDir = path.join(shellRoot, "android");
const gradleWrapper = path.join(androidDir, process.platform === "win32" ? "gradlew.bat" : "gradlew");

if (!fs.existsSync(gradleWrapper)) {
  console.error("[mobile] Android Gradle wrapper is missing. Run `cap add android` before building.");
  process.exit(1);
}

if (process.platform !== "win32") {
  fs.chmodSync(gradleWrapper, 0o755);
}

const hasSigning = [
  "ANDROID_KEYSTORE_FILE",
  "ANDROID_KEYSTORE_PASSWORD",
  "ANDROID_KEY_ALIAS",
  "ANDROID_KEY_PASSWORD",
].every((key) => Boolean(process.env[key]));

if (storeRelease && !hasSigning) {
  console.error("[mobile] Android store release requires ANDROID_KEYSTORE_FILE, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, and ANDROID_KEY_PASSWORD.");
  process.exit(1);
}

const tasks = hasSigning || storeRelease ? ["bundleRelease", "assembleRelease"] : ["assembleDebug"];
console.log(`[mobile] Building Android ${hasSigning || storeRelease ? "signed store release" : "debug preview"} artifact.`);

const result = spawnSync(gradleWrapper, tasks, {
  cwd: androidDir,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if ((result.status ?? 1) !== 0) {
  process.exit(result.status ?? 1);
}

if (storeRelease) {
  const bundleDir = path.join(androidDir, "app", "build", "outputs", "bundle", "release");
  const hasBundle = fs.existsSync(bundleDir) && fs.readdirSync(bundleDir).some((file) => file.endsWith(".aab"));
  if (!hasBundle) {
    console.error("[mobile] Android store release did not produce a release .aab artifact.");
    process.exit(1);
  }
}

process.exit(0);
