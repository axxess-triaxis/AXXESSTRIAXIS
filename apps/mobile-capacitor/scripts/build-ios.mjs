import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const shellRoot = path.resolve(scriptDir, "..");
const iosDir = path.join(shellRoot, "ios", "App");
const workspace = path.join(iosDir, "App.xcworkspace");
const project = path.join(iosDir, "App.xcodeproj");
const buildDir = path.join(iosDir, "build");

if (process.platform !== "darwin") {
  console.log("[mobile] iOS builds require macOS; skipping local iOS artifact build on this runner.");
  process.exit(0);
}

if (!fs.existsSync(workspace) && !fs.existsSync(project)) {
  console.error("[mobile] iOS project is missing. Run `cap add ios` before building.");
  process.exit(1);
}

fs.mkdirSync(buildDir, { recursive: true });

const hasSigning = ["APPLE_TEAM_ID", "ASC_KEY_ID", "ASC_ISSUER_ID", "ASC_PRIVATE_KEY"].every((key) =>
  Boolean(process.env[key]),
);

const baseArgs = fs.existsSync(workspace)
  ? ["-workspace", workspace, "-scheme", "App"]
  : ["-project", project, "-scheme", "App"];

const args = hasSigning
  ? [
      ...baseArgs,
      "-configuration",
      "Release",
      "-archivePath",
      path.join(buildDir, "App.xcarchive"),
      "archive",
      `DEVELOPMENT_TEAM=${process.env.APPLE_TEAM_ID}`,
      "-allowProvisioningUpdates",
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

console.log(`[mobile] Building iOS ${hasSigning ? "signed archive" : "simulator preview"} artifact.`);

const result = spawnSync("xcodebuild", args, {
  cwd: iosDir,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
