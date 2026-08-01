# Tenant Partitioning -- Demo Reference Inventory (Sprint TP-2, 2026-07-28)

Date: 2026-07-28
Governance source: `CLAUDE.md`'s evidence-chain discipline; sprint executed per Codex's formal
"Sprint TP-2: Repository, API and Demo Boundary Audit" prompt.
Method: `grep -rl` across `src/` for each search term, then every match reviewed for whether the
consuming component/function gates the reference behind `isDemoModeEnabled()` (or an equivalent
runtime check) or renders it unconditionally.

## Summary

Searched: `demoDataset`, `North East Health Mission`, `Investor Preview`, `Ananya Rao`,
`isDemoMode`/`demoMode` (as gating-function usage), `fallback`, `sample`, `mock`, `placeholder`.

**3 unsafe live renders found and fixed this sprint** (all three are the same failure class as
A-28: a real, authenticated, non-demo code path rendering the seeded demo institution's identity
unconditionally). **1 stale/dead code item found, not removed** (zero risk, zero consumers).
Everything else reviewed classifies as safe.

## Findings Table

| File | Reference | Classification | Risk | Action Taken | Remaining Action |
|---|---|---|---|---|---|
| `src/features/settings/SettingsSection.tsx` (`OrganizationPanel`) | `demoDatasetSummary.organizationName/.projects/.documents` | Was: unsafe live render | Critical (real tenant identity leak, HITL-confirmed live) | **Fixed in Sprint TP-1** -- now queries real org record in live mode | HITL live confirmation pending (A-28) |
| `src/app/api/admin/mobile-release/route.ts` (`buildRuntimeSnapshot`) | `organizationName: "North East Health Mission"` hardcoded unconditionally | Was: unsafe live render | Critical -- real, authenticated, RBAC-protected route (`/admin/mobile-release`), value directly rendered in `MobileStoreLaunchConsole.tsx` (`{snapshot.organizationName}`) | **Fixed this sprint** -- now fetches real org name via `organizationsRepository.getById`, only shows the demo name when `isDemoModeEnabled()` | New actionable added (A-69), HITL live check needed |
| `src/services/pilot/pilotAcceptanceRuntime.ts` (`buildPilotAcceptanceRuntimeSnapshot`) | `organizationName: "North East Health Mission"` hardcoded unconditionally | Was: unsafe live render | Critical -- feeds two real, authenticated routes: `/api/admin/pilot-acceptance` (Pilot Command Center panel) and, transitively, `/api/admin/customer-success/live-ops` (Customer Success Live Ops panel) | **Fixed this sprint** -- now fetches real org name unless `seededPilotEvidence` (build-time-forced demo mode or explicit preview mode) is true | New actionable added (A-69), HITL live check needed |
| `src/services/pilot/pilotAcceptance.ts` (`buildPilotTenantAcceptanceSnapshot` default) | `input.organizationName ?? "North East Health Mission"` | Was: unsafe default | Medium -- only reached if a caller forgets to pass a name; both real callers above now always pass one | **Fixed this sprint** -- default changed to "Organization setup pending", an honest generic label instead of a specific demo institution name | None |
| `src/services/mobile/mobileStoreLaunch.ts` (`buildMobileStoreLaunchSnapshot` default) | `input.organizationName ?? "North East Health Mission"` | Was: unsafe default | Medium -- same reasoning as above | **Fixed this sprint** -- same honest default | None |
| `src/features/ai-workspace/AIWorkspaceSection.tsx` | Unconditional `useEffect` firing a hardcoded "Which North East Health Mission district risks..." RAG query against the current tenant's own real documents on every page load | Was: unsafe live render | Medium -- ran for every real tenant regardless of mode (though `answer.sources.length > 0` gating meant it usually rendered nothing visible for a live tenant with unrelated documents); wasteful and semantically wrong regardless of visible impact. The same file's own `initialRagAnswer()` already correctly gated an equivalent choice on `isDemoModeEnabled()` -- this effect just didn't follow the same rule | **Fixed this sprint** -- gated behind `isDemoModeEnabled()`, consistent with the file's own existing pattern | None |
| `src/features/admin/EnterpriseAdminPage.tsx` (`pilotAcceptancePreviewSnapshot`, `customerSuccessPreviewSnapshot`, `mobileStoreLaunchPreviewSnapshot`) | Hardcoded `"North East Health Mission"` / `org_north_east_health_mission` passed as `initialSnapshot` prop | Safe (brief SSR-safe placeholder) | Low -- confirmed these are pre-fetch initial-render values only; `MobileStoreLaunchConsole.tsx`, `PilotAcceptancePanel.tsx`, and `CustomerSuccessLiveOpsPanel.tsx` all `useEffect`-fetch the real backing API route on mount and replace this value. The bug was entirely in the backing API routes (fixed above), not this initial placeholder | None -- correct pattern once the backing routes are fixed | None |
| `src/security/rbac.ts` (`mockCurrentUserContext`) | `displayName: "Ananya Rao"`, `organizationId: "org_north_east_health_mission"` | Stale/dead code | None currently -- confirmed zero consumers anywhere in `src/` besides its own test file (`grep -rln` returns only `rbac.ts` and `rbac.test.ts`) | Not removed this sprint (out of scope; removing an exported symbol is a larger change than this sprint's "safe, obvious" mandate) | Recommended cleanup: delete in a future pass once confirmed still unused |
| `src/demo/demoDataset.ts`, `src/demo/demoRepositories.ts`, `src/demo/demoMode.ts` | Definition/infrastructure files for the demo system itself | Safe -- this is the demo system, by design | None | None | None |
| `src/mocks/institutionalData.ts`, `src/features/knowledge-hub/knowledgeHubData.ts` | `createDemoDataset` import | Safe -- `knowledgeHubData.ts`'s consumer (`KnowledgeHubSection.tsx`) gates every usage behind `isDemoModeEnabled()`; `institutionalData.ts`'s only consumer (`legacyInstitutionalViewRepository.ts`) has zero further consumers anywhere (dead code) | None | None | Same dead-code cleanup note as `rbac.ts`, lower priority |
| `src/services/nlp/localNlp.ts` (`localOrganizations` list) | `"North East Health Mission"` as one of several entries in a static organization-name gazetteer used for local NLP entity recognition | Safe -- a reference list used to recognize organization names *mentioned inside arbitrary real input text* (e.g., a real tenant's own document happens to name a known institution), not something rendered as-if belonging to the current tenant | None | None | None |
| Every other file matching `isDemoMode`/`demoMode` (~25+ files not listed individually) | Calls to `isDemoModeEnabled()`/`setDemoModeEnabled()`/`isDemoModeForcedByEnv()` themselves | Safe -- this is the correct gating pattern by definition; these are the call sites doing the checking, not being checked | None | None | None |
| `fallback`/`sample`/`mock`/`placeholder` (generic terms) | Broad, high-noise search terms matching hundreds of legitimate non-demo uses (React fallback UI, sample form placeholder text, TypeScript mock objects in tests, HTML `placeholder=` attributes) | Mixed, mostly safe | Low, diffuse | Not exhaustively triaged individually -- too broad to be a meaningful signal on its own; the specific, high-confidence literal-content searches above (`demoDataset`, `North East Health Mission`, `Ananya Rao`) are a stronger, more precise proxy for this exact failure class and were exhaustively covered | A dedicated pass specifically for the "module-level-constant-computed-from-isDemoModeEnabled()" pattern is still recommended by `DEMO_DATA_LEAKAGE_AUDIT.md`'s own Round 5 note, independent of this inventory |

## What This Inventory Does Not Cover

- The generic `fallback`/`sample`/`mock`/`placeholder` terms were not exhaustively triaged file by
  file -- see the table row above for why, and what the recommended follow-up is.
- This inventory is a snapshot as of 2026-07-28. New code can reintroduce this exact pattern;
  the mode-boundary helper strengthened this sprint (see closeout) and the new regression tests
  reduce but do not eliminate that risk.
