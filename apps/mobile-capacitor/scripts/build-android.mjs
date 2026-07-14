import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const tasks = hasSigning ? ["assembleRelease", "bundleRelease"] : ["assembleDebug"];
console.log(`[mobile] Building Android ${hasSigning ? "release" : "debug preview"} artifact.`);

const result = spawnSync(gradleWrapper, tasks, {
  cwd: androidDir,
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
