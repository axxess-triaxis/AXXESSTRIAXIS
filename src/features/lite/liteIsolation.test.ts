import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// XL-1 (2026-08-05): the explicit, sprint-required proof that AXXESS Lite's route tree and
// feature folder never import X0's heavy enterprise surfaces (Executive Dashboard, Sidebar,
// TopBar, AppShell, admin panels, Beta Readiness, or the investor-demo dataset). This is a
// static import scan, not just a render assertion -- it fails the moment a forbidden import is
// written, before it could ever render. See
// docs/readiness/AXXESS_LITE_DOCTRINE_AND_SURFACE_CONSTITUTION_2026_08_05.md Section 6.2.
//
// XL-2 (2026-08-05): extended per the production navigation contract's Hard Boundaries #4-#7
// (docs/readiness/AXXESS_LITE_PRODUCTION_SCOPE_AND_NAVIGATION_CONTRACT_2026_08_05.md) -- Golden
// Path, Social Alerts, the full integrations catalogue, and Agentic MCP admin must never render
// in Lite either.
const repoRoot = join(__dirname, "..", "..", "..");
const liteDirs = [join(repoRoot, "src", "app", "lite"), join(repoRoot, "src", "features", "lite")];

const forbiddenSpecifiers = [
  "workspace-page",
  "/App\"",
  "./App\"",
  "DashboardSection",
  "TenantHealthCommandCenter",
  "BetaReadinessSection",
  "layout/Sidebar",
  "layout/TopBar",
  "layout/AppShell",
  "EnterpriseOnboardingPage",
  "demoOrganization",
  "demoUserContext",
  "app/admin",
  // XL-2 additions -- Golden Path
  "EnterpriseWorkflowJourney",
  "useEnterpriseGoldenPath",
  "useGoldenPathDisplayMode",
  // XL-2 additions -- Social Alerts
  "features/alerts/AlertsSection",
  "AlertsSection",
  // XL-2 additions -- full integration catalogue + Agentic MCP admin (lives inside it)
  "features/integrations/IntegrationsSection",
  "AgentConnectionsPanel",
  "services/integrations/pluginRegistry",
  // XL-2 additions -- X0's full Settings admin console (Lite has its own LiteSettingsSection)
  "features/settings/SettingsSection",
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

describe("AXXESS Lite import isolation", () => {
  const liteSourceFiles = liteDirs.flatMap((dir) => collectSourceFiles(dir));

  it("finds a non-trivial set of Lite source files to check (sanity check the scan itself works)", () => {
    expect(liteSourceFiles.length).toBeGreaterThanOrEqual(9);
  });

  it.each(liteSourceFiles.map((filePath) => [filePath] as const))("%s does not import any X0-only or demo-only module", (filePath) => {
    const raw = readFileSync(filePath, "utf-8");
    // Explanatory comments in this feature legitimately name the X0 modules Lite must NOT import
    // (that's the point of documenting the boundary) -- strip comments so only real import/code
    // statements are checked, not prose that mentions the forbidden module names.
    const codeOnly = raw.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const forbidden of forbiddenSpecifiers) {
      expect(codeOnly, `${filePath} must not reference "${forbidden}" outside of a comment`).not.toContain(forbidden);
    }
  });
});
