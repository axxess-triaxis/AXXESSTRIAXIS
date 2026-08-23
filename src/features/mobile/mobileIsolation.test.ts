import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// MN-1 (2026-08-23): mirrors src/features/lite/liteIsolation.test.ts's structure exactly -- the
// explicit, sprint-required proof that X0 Mobile's own feature folder never imports X0's heavy
// enterprise surfaces (Executive Dashboard, Sidebar, TopBar, AppShell, admin panels, Beta
// Readiness, Social Alerts, complex analytics, the full integration catalogue, Golden Path, the
// agentic control plane, or the investor-demo dataset). A static import scan, not just a render
// assertion -- it fails the moment a forbidden import is written, before it could ever render. See
// docs/readiness/MOBILE_NATIVE_CAPACITOR_RESEARCH_AND_ROADMAP_2026_08_23.md's Mobile Surface
// Contract.
const repoRoot = join(__dirname, "..", "..", "..");
const mobileDirs = [join(repoRoot, "src", "features", "mobile")];

const forbiddenSpecifiers = [
  "features/dashboard",
  "DashboardSection",
  "TenantHealthCommandCenter",
  "layout/Sidebar",
  "layout/TopBar",
  "layout/AppShell",
  "features/alerts",
  "AlertsSection",
  "features/beta-readiness",
  "BetaReadinessSection",
  "features/analytics",
  "features/product-analytics",
  "features/integrations/IntegrationsSection",
  "AgentConnectionsPanel",
  "features/admin/",
  "demo/demoDataset",
  "demoOrganization",
  "demoUserContext",
  "EnterpriseWorkflowJourney",
  "useEnterpriseGoldenPath",
  "useGoldenPathDisplayMode",
  "pluginRuntime",
  "/api/agents",
  "/api/plugins/runtime",
];

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (/\.(tsx?|jsx?)$/.test(entry) && !entry.endsWith(".test.ts") && !entry.endsWith(".test.tsx")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("AXXESS X0 Mobile import isolation", () => {
  const mobileSourceFiles = mobileDirs.flatMap((dir) => collectSourceFiles(dir));

  it("finds a non-trivial set of X0 Mobile source files to check (sanity check the scan itself works)", () => {
    expect(mobileSourceFiles.length).toBeGreaterThanOrEqual(8);
  });

  it.each(mobileSourceFiles.map((filePath) => [filePath] as const))("%s does not import any forbidden X0 desktop/demo/admin surface", (filePath) => {
    const raw = readFileSync(filePath, "utf-8");
    // Explanatory comments in this feature legitimately name the X0 modules mobile must NOT import
    // (that's the point of documenting the boundary) -- strip comments so only real import/code
    // statements are checked, not prose that mentions the forbidden module names.
    const codeOnly = raw.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const forbidden of forbiddenSpecifiers) {
      expect(codeOnly, `${filePath} must not reference "${forbidden}" outside of a comment`).not.toContain(forbidden);
    }
  });

  it("mobileFeatureRegistry includes every surface named in the roadmap's Mobile Surface Contract", async () => {
    const { mobileFeatureRegistry } = await import("./mobileFeatureRegistry");
    const ids = mobileFeatureRegistry.map((entry) => entry.id);
    for (const required of ["home", "tasks", "reminders", "meetings", "projects", "approvals", "knowledge", "ai-workspace", "stakeholders", "settings"]) {
      expect(ids, `mobileFeatureRegistry is missing required entry "${required}"`).toContain(required);
    }
  });

  it("mobileFeatureRegistry never maps to a forbidden NavSection", async () => {
    const { mobileFeatureRegistry } = await import("./mobileFeatureRegistry");
    const forbiddenSections = new Set(["dashboard", "alerts", "analytics", "product-analytics", "beta-readiness", "organization-admin", "integrations", "audit-logs", "pilot-conversion"]);
    for (const entry of mobileFeatureRegistry) {
      if (entry.section) {
        expect(forbiddenSections.has(entry.section), `mobileFeatureRegistry entry "${entry.id}" maps to forbidden section "${entry.section}"`).toBe(false);
      }
    }
  });
});
