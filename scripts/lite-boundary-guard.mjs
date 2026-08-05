import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const scanRoots = [
  "src/app/lite",
  "src/features/lite",
  "apps/lite-web",
  "apps/mobile-lite-capacitor",
];

const requiredPaths = [
  "src/app/lite",
  "src/features/lite",
  "apps/lite-web/package.json",
  "apps/mobile-lite-capacitor/capacitor.config.ts",
];

const forbiddenPatterns = [
  { pattern: /from\s+["'][^"']*features\/dashboard/i, reason: "X0 Executive Dashboard is not allowed in Lite." },
  { pattern: /from\s+["'][^"']*features\/alerts/i, reason: "Social Alerts are excluded from Lite." },
  { pattern: /from\s+["'][^"']*features\/beta-readiness/i, reason: "Beta readiness surfaces are X0/internal only." },
  { pattern: /from\s+["'][^"']*features\/settings\/SettingsSection/i, reason: "X0 Settings/Admin console is not allowed in Lite." },
  { pattern: /from\s+["'][^"']*features\/integrations\/IntegrationsSection/i, reason: "Full integration catalogue is not allowed in Lite." },
  { pattern: /from\s+["'][^"']*demo\//i, reason: "Investor Demo data/control modules are not allowed in Lite." },
  { pattern: /from\s+["'][^"']*app\/layout\/(Sidebar|TopBar|AppShell)/i, reason: "X0 shell chrome is not allowed in Lite." },
  { pattern: /DashboardSection|TenantHealthCommandCenter|EnterpriseWorkflowJourney/i, reason: "X0 dashboard/golden-path components are not allowed in Lite." },
  { pattern: /Golden Path|Tenant Health Command Center|Pilot Command Center|Customer Success Live Ops/i, reason: "X0 enterprise command-center vocabulary is not allowed in Lite source." },
  { pattern: /AgentConnectionsPanel|agentic|pluginRuntime|\/api\/agents/i, reason: "Complex agentic workflows are excluded from Lite." },
  { pattern: /demoDataset|demoOrganization|demoUserContext|North East Health Mission|Ananya Rao/i, reason: "Demo data must never appear in Lite." },
  { pattern: /social-connector-sync|Social Alerts/i, reason: "Social alert sync/surfaces are excluded from Lite." },
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
    failures.push(`${requiredPath}: required Lite boundary path is missing.`);
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
      const isLiteBoundaryTest = isTest && rel.startsWith("src/features/lite/");
      if (isLiteBoundaryTest) continue;
      failures.push(`${rel}: ${reason} Pattern: ${pattern}`);
    }
  }
}

const litePackagePath = join(repoRoot, "apps/lite-web/package.json");
if (existsSync(litePackagePath)) {
  const litePackage = JSON.parse(readFileSync(litePackagePath, "utf8"));
  if (litePackage.name !== "@axxess/lite-web") {
    failures.push("apps/lite-web/package.json: package name must be @axxess/lite-web.");
  }
  for (const scriptName of ["guard", "test", "build", "mobile:validate", "ci"]) {
    if (!litePackage.scripts?.[scriptName]) {
      failures.push(`apps/lite-web/package.json: missing ${scriptName} script.`);
    }
  }
}

if (files.length < 12) {
  failures.push(`Lite boundary scan saw only ${files.length} files; expected a non-trivial Lite surface.`);
}

if (failures.length > 0) {
  console.error("AXXESS Lite boundary guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`AXXESS Lite boundary guard passed across ${files.length} files.`);
