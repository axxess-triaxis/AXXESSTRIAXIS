import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// MN-1 (2026-08-23): mirrors scripts/lite-boundary-guard.mjs's structure exactly -- same static
// import-scan approach, applied to X0 Mobile's own surface instead of Lite's. See
// docs/readiness/MOBILE_NATIVE_CAPACITOR_RESEARCH_AND_ROADMAP_2026_08_23.md's "Mobile Surface
// Contract" for the source-of-truth include/exclude list this encodes.
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const scanRoots = ["src/features/mobile"];

const requiredPaths = [
  "src/features/mobile/mobileFeatureRegistry.ts",
  "src/features/mobile/MobileShell.tsx",
  "src/features/mobile/isNativeMobileSurface.ts",
];

const forbiddenPatterns = [
  { pattern: /from\s+["'][^"']*features\/dashboard/i, reason: "Full Executive Dashboard is excluded from X0 Mobile." },
  { pattern: /from\s+["'][^"']*features\/alerts/i, reason: "Social Alerts is excluded from X0 Mobile." },
  { pattern: /from\s+["'][^"']*features\/beta-readiness/i, reason: "Beta Readiness is excluded from X0 Mobile." },
  { pattern: /from\s+["'][^"']*features\/analytics/i, reason: "Complex analytics is excluded from X0 Mobile." },
  { pattern: /from\s+["'][^"']*features\/product-analytics/i, reason: "Product Analytics (internal admin surface) is excluded from X0 Mobile." },
  { pattern: /from\s+["'][^"']*features\/integrations\/IntegrationsSection/i, reason: "Full integration catalogue is excluded from X0 Mobile." },
  { pattern: /from\s+["'][^"']*features\/admin\//i, reason: "X0 admin panels (org admin, audit logs, pilot conversion, store release console, etc.) are excluded from X0 Mobile." },
  { pattern: /from\s+["'][^"']*demo\//i, reason: "Investor Demo data/control modules are excluded from X0 Mobile." },
  { pattern: /from\s+["'][^"']*app\/layout\/(Sidebar|TopBar|AppShell)/i, reason: "X0 desktop shell chrome is excluded from X0 Mobile -- MobileShell replaces it entirely." },
  { pattern: /DashboardSection|TenantHealthCommandCenter|EnterpriseWorkflowJourney/i, reason: "X0 dashboard/golden-path components are excluded from X0 Mobile." },
  { pattern: /Golden Path|Tenant Health Command Center|Pilot Command Center|Customer Success Live Ops/i, reason: "X0 enterprise command-center vocabulary is excluded from X0 Mobile source." },
  { pattern: /AgentConnectionsPanel|pluginRuntime|\/api\/agents|\/api\/plugins\/runtime/i, reason: "The heavy agentic control plane is excluded from X0 Mobile." },
  { pattern: /demoDataset|demoOrganization|demoUserContext|North East Health Mission|Ananya Rao/i, reason: "Demo data must never appear in X0 Mobile." },
  { pattern: /useEnterpriseGoldenPath|useGoldenPathDisplayMode/i, reason: "Golden Path is excluded from X0 Mobile." },
];

const allowedTestFilePattern = /\.(test|spec)\.(ts|tsx|js|jsx)$/;

function stripComments(source) {
  return source.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

function collectFiles(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      if (["node_modules", ".next", "dist", "android", "ios"].includes(entry)) continue;
      files.push(...collectFiles(fullPath));
      continue;
    }
    if (/\.(tsx?|jsx?|mjs|cjs|json)$/.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

const failures = [];

for (const requiredPath of requiredPaths) {
  if (!existsSync(join(repoRoot, requiredPath))) {
    failures.push(`${requiredPath}: required X0 Mobile boundary file is missing.`);
  }
}

const files = scanRoots.flatMap((root) => collectFiles(join(repoRoot, root)));

for (const filePath of files) {
  const rel = relative(repoRoot, filePath).replaceAll("\\", "/");
  const raw = readFileSync(filePath, "utf8");
  const source = filePath.endsWith(".json") ? raw : stripComments(raw);
  for (const { pattern, reason } of forbiddenPatterns) {
    if (pattern.test(source)) {
      const isTest = allowedTestFilePattern.test(filePath);
      const isMobileBoundaryTest = isTest && rel.startsWith("src/features/mobile/");
      if (isMobileBoundaryTest) continue;
      failures.push(`${rel}: ${reason} Pattern: ${pattern}`);
    }
  }
}

if (files.length < 8) {
  failures.push(`X0 Mobile boundary scan saw only ${files.length} files; expected a non-trivial mobile surface.`);
}

// Also confirm App.tsx's own integration point still exists and still checks the native-surface
// flag before rendering MobileShell -- a source-scan for src/features/mobile alone wouldn't catch
// someone deleting the branch in App.tsx and leaving MobileShell as orphaned, unused code.
const appTsxPath = join(repoRoot, "src/app/App.tsx");
if (!existsSync(appTsxPath)) {
  failures.push("src/app/App.tsx: missing -- cannot verify MobileShell is actually wired into the app entry point.");
} else {
  const appSource = stripComments(readFileSync(appTsxPath, "utf8"));
  if (!/isNativeMobile/.test(appSource) || !/<MobileShell/.test(appSource)) {
    failures.push("src/app/App.tsx: does not appear to render <MobileShell> behind an isNativeMobile check -- MobileShell may be orphaned.");
  }
  if (/<AppShell[\s\S]*isNativeMobile[\s\S]*false/i.test(appSource) === false && /if \(isNativeMobile\)/.test(appSource) === false) {
    failures.push("src/app/App.tsx: could not confirm the native-mobile branch is checked before the desktop AppShell branch.");
  }
}

if (failures.length > 0) {
  console.error("AXXESS X0 Mobile boundary guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`AXXESS X0 Mobile boundary guard passed across ${files.length} files.`);
