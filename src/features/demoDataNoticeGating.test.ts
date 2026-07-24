import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Sprint 4 (Integrations, Analytics, and Operational Evidence -- WS6 badge/overclaim audit): three
// components called <DemoDataNotice> unconditionally, so every real live tenant -- not just
// Investor Preview -- saw a fixed "Investor Preview:"-prefixed banner (e.g. claiming Knowledge Hub
// shows "RAG indexing state" or that admin records are "seeded"). Seven other components in this
// codebase already correctly gate this same component behind a demo/source check
// (AnalyticsSection.tsx, ApprovalsSection.tsx, StakeholdersSection.tsx, DashboardSection.tsx,
// ProjectsSection.tsx, TasksSection.tsx, AIWorkspaceSection.tsx) -- this fix brings the remaining
// three in line with that established pattern rather than inventing a new one.
const fixedFiles: Array<{ file: string; guard: string }> = [
  { file: "src/features/knowledge-hub/KnowledgeHubSection.tsx", guard: "isDemoModeEnabled()" },
  { file: "src/features/admin/OrganizationAdminSection.tsx", guard: "isDemoModeEnabled()" },
  { file: "src/features/admin/PilotConversionSection.tsx", guard: 'state.source === "Demo"' },
];

describe("DemoDataNotice is never shown unconditionally to a real live tenant (Sprint 4 WS6)", () => {
  it.each(fixedFiles)("$file gates its DemoDataNotice behind $guard", ({ file, guard }) => {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    const noticeIndex = source.indexOf("<DemoDataNotice");
    expect(noticeIndex).toBeGreaterThan(-1);

    const guardIndex = source.lastIndexOf(guard, noticeIndex);
    expect(guardIndex).toBeGreaterThan(-1);
    // The guard must be the nearest conditional wrapper -- i.e. no unconditional JSX return or
    // another element boundary between the guard and the notice that would put it outside the
    // gate. A loose heuristic (no closing "/>" of an unrelated earlier element between them) is
    // enough here: the guard and notice must be close together, not merely both present anywhere
    // in the file.
    const between = source.slice(guardIndex, noticeIndex);
    expect(between.length).toBeLessThan(60);
  });
});
