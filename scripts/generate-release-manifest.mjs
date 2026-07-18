#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function argValue(name, fallback = "") {
  const token = process.argv.find((value) => value.startsWith(`${name}=`));
  return token ? token.slice(name.length + 1) : fallback;
}

const androidDir = argValue("--androidDir", "artifacts/android");
const iosDir = argValue("--iosDir", "artifacts/ios");
const checklistAll = argValue("--checklistAll", "artifacts/release-checklist/release-checklist-all.json");
const checklistAndroid = argValue("--checklistAndroid", "");
const checklistIos = argValue("--checklistIos", "");
const outputPath = argValue("--output", "apps/mobile-capacitor/build-metadata/release-manifest.json");

function walk(currentPath) {
  const entries = [];
  if (!fs.existsSync(currentPath)) {
    return entries;
  }

  for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
    const absolute = path.join(currentPath, entry.name);
    if (entry.isDirectory()) {
      entries.push(...walk(absolute));
    } else if (entry.isFile()) {
      entries.push(absolute);
    }
  }
  return entries;
}

function sha256(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return `sha256:${hash.digest("hex")}`;
}

function relativeNormalize(filePath) {
  return filePath.split(path.sep).join("/");
}

function fileRecord(filePath) {
  const stat = fs.statSync(filePath);
  return {
    path: relativeNormalize(filePath),
    sizeBytes: stat.size,
    sha256: sha256(filePath),
  };
}

function readJson(filePath, fallback = null) {
  if (!filePath || !fs.existsSync(filePath)) {
    return fallback;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function findFirstBySuffix(files, suffixes) {
  for (const file of files) {
    for (const suffix of suffixes) {
      if (file.toLowerCase().endsWith(suffix)) {
        return file;
      }
    }
  }
  return "";
}

function findFirstByName(files, name) {
  for (const file of files) {
    if (path.basename(file) === name) {
      return file;
    }
  }
  return "";
}

const androidFiles = walk(androidDir);
const iosFiles = walk(iosDir);
const allFiles = [...androidFiles, ...iosFiles];

const androidBinary = findFirstBySuffix(androidFiles, [".aab", ".apk"]);
const iosBinary = findFirstBySuffix(iosFiles, [".ipa"]);

const generatedAt = new Date().toISOString();
const manifest = {
  generatedAt,
  run: {
    workflow: process.env.GITHUB_WORKFLOW ?? "local",
    runId: process.env.GITHUB_RUN_ID ?? "local",
    runNumber: process.env.GITHUB_RUN_NUMBER ?? "local",
    ref: process.env.GITHUB_REF_NAME ?? "local",
    commitSha: process.env.GITHUB_SHA ?? "local",
  },
  release: {
    appVersion: process.env.RELEASE_APP_VERSION ?? process.env.EXPO_PUBLIC_AXXESS_APP_VERSION ?? process.env.NEXT_PUBLIC_AXXESS_APP_VERSION ?? "unknown",
    iosBuildNumber: process.env.IOS_BUILD_NUMBER ?? process.env.EXPO_PUBLIC_IOS_BUILD_NUMBER ?? "unknown",
    androidVersionCode: process.env.ANDROID_VERSION_CODE ?? process.env.EXPO_PUBLIC_ANDROID_VERSION_CODE ?? "unknown",
  },
  checks: {
    androidBinaryPath: relativeNormalize(androidBinary || ""),
    iosBinaryPath: relativeNormalize(iosBinary || ""),
    allChecklistPresent: Boolean(checklistAll && checklistAndroid && checklistIos),
  },
  artifacts: {
    android: androidFiles.map(fileRecord),
    ios: iosFiles.map(fileRecord),
    combinedCount: allFiles.length,
  },
  checklists: {
    all: readJson(checklistAll, {}),
    android: readJson(checklistAndroid || findFirstByName(androidFiles, "release-checklist-android.json"), {}),
    ios: readJson(checklistIos || findFirstByName(iosFiles, "release-checklist-ios.json"), {}),
  },
};

const outputAbsolute = path.resolve(outputPath);
fs.mkdirSync(path.dirname(outputAbsolute), { recursive: true });
fs.writeFileSync(outputAbsolute, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`[manifest] Wrote ${outputAbsolute}`);
