# Product Surface Boundary Map

Governed by: `CLAUDE.md` (Operating Model), memory `project_ux_information_architecture.md`. Created
2026-08-17.

**Important scoping note**: the cell contents below (routes, key files, guard tests) were not
independently re-audited against current code in this pass -- populating exact route lists and guard
tests for all four surfaces is a real investigation, not something that can be done accurately from the
founder's paraphrase alone without risking stale or wrong entries. This document seeds the **table
structure** and what is already confirmed from existing memory/docs; the Included/Excluded columns for
Lite/X0/MCP boundaries specifically named in the founder's request should be filled in by a session that
actually re-reads the current Lite/X0 routing code, not asserted here from memory.

| Surface | Included | Excluded | Routes | Key files | Guard tests |
|---|---|---|---|---|---|
| X0 / full enterprise | AI Workspace (work), Exec Dashboard (governance/macro), Knowledge Hub (storage), Documents (info governance) -- per `project_ux_information_architecture.md` | Lite-only simplified flows | Not re-audited this pass | Not re-audited this pass | Not re-audited this pass |
| AXXESS Lite Web | Self-serve workspace flows | Agentic MCP admin, enterprise command center (per founder's governance request, not independently re-verified this pass) | Not re-audited this pass | Not re-audited this pass | Not re-audited this pass |
| Lite Mobile | Mobile Lite flows; currently blocked from store release pending DUNS number (memory `project_duns_mobile_release_blocker.md`, expected ~2026-08-25) | X0 enterprise shell | Not re-audited this pass | Not re-audited this pass | Not re-audited this pass |
| Demo/Investor | Seeded preview data on `investor.triaxisventures.com` (memory `feedback_investor_vs_landing_domain_standing_rule.md`: investor.* = future/beautified/demo) | Real tenant data mutation, unless explicitly allowed per demo-mode branching in individual features | `investor.triaxisventures.com`, `landing.triaxisventures.com` (present/honest/0%-placeholder per the same memory) | Feature-level `isDemoModeEnabled()` branches (e.g. `ProductAnalyticsSection.tsx`) | Feature-level demo-mode tests (e.g. `ProductAnalyticsSection.test.tsx`'s demo-mode describe blocks) |

## Follow-up

The Lite/X0/MCP boundary rows above are the ones the founder's original governance message named as
examples ("Lite excluded from Agentic MCP admin", "X0/full enterprise owns MCP3"). If these are still the
correct, current boundaries, a follow-up session should verify against `src/app/routing/routes.ts` and
the Lite feature registry (`src/features/lite/liteFeatureRegistry.ts`, referenced in existing test
`liteFeatureRegistry.test.ts`) and fill in the Routes/Key files/Guard tests columns with real citations.
