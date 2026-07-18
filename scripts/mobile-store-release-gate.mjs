#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function filePath(relativePath) {
  return path.join(root, relativePath);
}

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, "/");
}

function read(relativePath) {
  const fullPath = filePath(relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

const appleNotes = read("docs/store/apple-review-notes.md");
const googleNotes = read("docs/store/google-play-notes.md");
const privacyLabels = read("docs/store/privacy-labels.md");
const dataSafety = read("docs/store/data-safety.md");
const manifestSource = read("docs/store/screenshot-manifest.json");
const consoleSource = read("src/features/admin/MobileStoreLaunchConsole.tsx");
const routeSource = read("src/app/api/admin/mobile-release/route.ts");
const migrationSource = read("supabase/migrations/20260718143000_sprint32_mobile_store_launch.sql");
const routeMetadataSource = read("src/app/routing/routes.ts");

let screenshotManifest;
try {
  screenshotManifest = JSON.parse(manifestSource);
} catch {
  failures.push("docs/store/screenshot-manifest.json must be valid JSON.");
}

expect(appleNotes.includes("reviewer.mobile@axxess.demo"), "Apple review notes must include reviewer account details.");
expect(googleNotes.includes("reviewer.mobile@axxess.demo"), "Google Play review notes must include reviewer account details.");
expect(privacyLabels.includes("AXXESS should not enable third-party tracking"), "Apple privacy labels must document tracking posture.");
expect(dataSafety.includes("Row Level Security"), "Google Play Data Safety draft must document tenant security practices.");
expect(consoleSource.includes("Mobile store launch console"), "Admin UI must expose the Mobile Store Launch Console.");
expect(consoleSource.includes("Crash and release health"), "Admin UI must expose crash and release health.");
expect(routeSource.includes("persistMobileStoreLaunchSnapshot"), "Admin route must persist mobile release snapshots.");
expect(routeSource.includes("mobile_release.${action}"), "Admin route must write mobile release audit actions.");
expect(routeMetadataSource.includes("admin/mobile-release"), "Route metadata must include the mobile release route.");
expect(migrationSource.includes("alter table public.mobile_release_runs enable row level security"), "Mobile release migration must enable RLS.");
expect(migrationSource.includes("public.has_any_role_text(organization_id, array['Super Admin', 'Organization Admin'])"), "Mobile release migration must enforce organization-admin writes.");

if (screenshotManifest) {
  const screenshots = Array.isArray(screenshotManifest.screenshots) ? screenshotManifest.screenshots : [];
  const routes = screenshots.map((item) => item.route);
  expect(screenshots.length >= 7, "Screenshot manifest must include at least seven store screenshots.");
  ["/auth/login", "/dashboard", "/ai-workspace/review-inbox", "/knowledge", "/approvals", "/workflow-records", "/admin/mobile-release"].forEach((route) => {
    expect(routes.includes(route), `Screenshot manifest must include ${route}.`);
  });
  screenshots.forEach((item) => {
    expect(Array.isArray(item.platforms) && item.platforms.includes("android") && item.platforms.includes("ios"), `${item.id ?? "screenshot"} must target Android and iOS.`);
    expect(Boolean(item.evidencePath), `${item.id ?? "screenshot"} must include an evidencePath.`);
  });
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`[mobile-store-release-gate] FAIL: ${failure}`);
  }
  process.exit(1);
}

console.log(`[mobile-store-release-gate] Release readiness pack verified from ${rel(root)}.`);
