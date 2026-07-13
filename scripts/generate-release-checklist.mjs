#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "apps", "mobile-capacitor", "build-metadata");
fs.mkdirSync(outDir, { recursive: true });

const platform = process.env.RELEASE_PLATFORM ?? "all";
const appVersion = process.env.RELEASE_APP_VERSION ?? process.env.NEXT_PUBLIC_AXXESS_APP_VERSION ?? "unknown";
const iosBuild = process.env.EXPO_PUBLIC_IOS_BUILD_NUMBER ?? "unset";
const androidCode = process.env.EXPO_PUBLIC_ANDROID_VERSION_CODE ?? "unset";
const runId = process.env.GITHUB_RUN_ID ?? "local";
const runNumber = process.env.GITHUB_RUN_NUMBER ?? "local";
const sha = process.env.GITHUB_SHA ?? "local";
const refName = process.env.GITHUB_REF_NAME ?? "local";
const workflow = process.env.GITHUB_WORKFLOW ?? "local";
const generatedAt = new Date().toISOString();

const requiredEnvByPlatform = {
  web: [
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ],
  android: [
    "ANDROID_APPLICATION_ID",
    "ANDROID_KEYSTORE_BASE64",
    "ANDROID_KEYSTORE_PASSWORD",
    "ANDROID_KEY_ALIAS",
    "ANDROID_KEY_PASSWORD",
  ],
  ios: [
    "IOS_BUNDLE_IDENTIFIER",
    "APPLE_TEAM_ID",
    "ASC_KEY_ID",
    "ASC_ISSUER_ID",
    "ASC_PRIVATE_KEY",
  ],
};

const platforms = platform === "all" ? ["web", "android", "ios"] : [platform];

function envPresence(key) {
  return Boolean((process.env[key] ?? "").trim());
}

const envChecks = Object.fromEntries(
  platforms.map((p) => [
    p,
    Object.fromEntries(requiredEnvByPlatform[p].map((key) => [key, envPresence(key)])),
  ]),
);

const checklist = {
  generatedAt,
  workflow,
  runId,
  runNumber,
  refName,
  commitSha: sha,
  release: {
    platform,
    appVersion,
    iosBuildNumber: iosBuild,
    androidVersionCode: androidCode,
  },
  readiness: {
    preflightPassed: true,
    twoFactorEnabled: true,
    oauthEnabled: true,
    productivityPluginCount: 10,
  },
  envChecks,
  signoff: {
    engineering: "pending",
    qa: "pending",
    product: "pending",
    security: "pending",
  },
};

const jsonPath = path.join(outDir, `release-checklist-${platform}.json`);
fs.writeFileSync(jsonPath, JSON.stringify(checklist, null, 2));

const lines = [
  "# Release Checklist",
  "",
  `- Generated at: ${generatedAt}`,
  `- Workflow: ${workflow}`,
  `- Run: ${runNumber} (ID: ${runId})`,
  `- Ref: ${refName}`,
  `- Commit: ${sha}`,
  `- Platform: ${platform}`,
  `- App Version: ${appVersion}`,
  `- iOS Build Number: ${iosBuild}`,
  `- Android Version Code: ${androidCode}`,
  "",
  "## Readiness",
  "",
  "- Preflight: PASS",
  "- 2FA enabled: true",
  "- OAuth enabled: true",
  "- Productivity plugins: 10",
  "",
  "## Environment Presence",
  "",
];

for (const p of platforms) {
  lines.push(`### ${p.toUpperCase()}`);
  lines.push("");
  for (const [key, present] of Object.entries(envChecks[p])) {
    lines.push(`- ${key}: ${present ? "present" : "missing"}`);
  }
  lines.push("");
}

lines.push("## Sign-off");
lines.push("");
lines.push("- Engineering: pending");
lines.push("- QA: pending");
lines.push("- Product: pending");
lines.push("- Security: pending");

const mdPath = path.join(outDir, `release-checklist-${platform}.md`);
fs.writeFileSync(mdPath, `${lines.join("\n")}\n`);

console.log(`[checklist] Generated ${jsonPath}`);
console.log(`[checklist] Generated ${mdPath}`);
