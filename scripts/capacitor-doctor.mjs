#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const shellRoot = path.join(root, "apps", "mobile-capacitor");
const requiredFiles = [
  "capacitor.config.ts",
  path.join("android", "app", "build.gradle"),
  path.join("android", "app", "src", "main", "AndroidManifest.xml"),
  path.join("android", "app", "src", "main", "res", "xml", "network_security_config.xml"),
  path.join("ios", "App", "Info.plist"),
  path.join("ios", "App", "AppDelegate.swift"),
  path.join("ios", "App", "ExportOptions.plist"),
  path.join("ios", "App", "PrivacyInfo.xcprivacy"),
];

const missing = requiredFiles.filter((relativePath) => !fs.existsSync(path.join(shellRoot, relativePath)));

if (missing.length > 0) {
  console.error("[mobile] Capacitor shell is missing required files:");
  for (const filePath of missing) {
    console.error(` - apps/mobile-capacitor/${filePath.replaceAll(path.sep, "/")}`);
  }
  process.exit(1);
}

const configPath = path.join(shellRoot, "capacitor.config.ts");
const configSource = fs.readFileSync(configPath, "utf8");
const requiredConfigFragments = ["appId:", "appName:", "webDir:", "server:", "allowNavigation:"];
const missingConfig = requiredConfigFragments.filter((fragment) => !configSource.includes(fragment));

if (missingConfig.length > 0) {
  console.error(`[mobile] Capacitor config is missing required fields: ${missingConfig.join(", ")}`);
  process.exit(1);
}

const advisoryFiles = [
  path.join("android", "gradlew"),
  path.join("android", "settings.gradle"),
  path.join("ios", "App", "App.xcodeproj", "project.pbxproj"),
];
const advisoryMissing = advisoryFiles.filter((relativePath) => !fs.existsSync(path.join(shellRoot, relativePath)));

if (advisoryMissing.length > 0) {
  console.warn("[mobile] Native build scaffolding is incomplete; release jobs must generate or restore these files before artifact build:");
  for (const filePath of advisoryMissing) {
    console.warn(` - apps/mobile-capacitor/${filePath.replaceAll(path.sep, "/")}`);
  }
}

console.log("[mobile] Capacitor shell validation passed.");
