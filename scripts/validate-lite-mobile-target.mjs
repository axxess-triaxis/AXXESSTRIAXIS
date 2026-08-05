import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const liteConfigPath = join(repoRoot, "apps/mobile-lite-capacitor/capacitor.config.ts");
const x0ConfigPath = join(repoRoot, "apps/mobile-capacitor/capacitor.config.ts");

const failures = [];

if (!existsSync(liteConfigPath)) {
  failures.push("apps/mobile-lite-capacitor/capacitor.config.ts is missing.");
} else {
  const liteConfig = readFileSync(liteConfigPath, "utf8");
  if (!liteConfig.includes("AXXESS Lite")) {
    failures.push("Lite Capacitor config must identify the app as AXXESS Lite.");
  }
  if (!liteConfig.includes("CAPACITOR_LITE_APP_ID")) {
    failures.push("Lite Capacitor config must use CAPACITOR_LITE_APP_ID, not the X0 app id variable.");
  }
  if (liteConfig.includes("CAPACITOR_APP_ID") || liteConfig.includes("ANDROID_APPLICATION_ID") || liteConfig.includes("IOS_BUNDLE_IDENTIFIER")) {
    failures.push("Lite Capacitor config must not reuse X0 mobile app identity variables.");
  }
  if (!liteConfig.includes("/lite") && !liteConfig.includes("lite.triaxisventures.com")) {
    failures.push("Lite Capacitor server URL must point at the Lite surface, not the X0 root.");
  }
  if (!liteConfig.includes("mobile-lite-capacitor") && !liteConfig.includes("AXXESS Lite Mobile")) {
    failures.push("Lite Capacitor config should remain clearly documented as the Lite mobile target.");
  }
}

if (existsSync(x0ConfigPath) && existsSync(liteConfigPath)) {
  const x0Config = readFileSync(x0ConfigPath, "utf8");
  const liteConfig = readFileSync(liteConfigPath, "utf8");
  if (x0Config === liteConfig) {
    failures.push("Lite Capacitor config is identical to X0 config; this would wrap the wrong product surface.");
  }
}

if (failures.length > 0) {
  console.error("AXXESS Lite mobile target validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("AXXESS Lite mobile target validation passed.");
