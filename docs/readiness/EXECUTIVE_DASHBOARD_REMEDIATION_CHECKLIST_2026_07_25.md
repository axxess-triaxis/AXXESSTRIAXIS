# Executive Dashboard Remediation Checklist

Date created: 2026-07-25  
Roadmap source: `docs/readiness/EXECUTIVE_DASHBOARD_REMEDIATION_ROADMAP_2026_07_25.md`  
Objective: Generate a 70-80% delta on the Executive Dashboard by moving the dashboard from 11/27 REAL elements to at least 19/27 REAL elements, with a preferred target of 21/27.

## Status Legend

Use one status per checklist item:

- `Not started`
- `In progress`
- `Done`
- `Blocked`
- `Deferred`

An item can be marked `Done` only if code, test, or documentation evidence exists.

## Baseline

| Metric | Current |
|---|---:|
| Total inventoried dashboard elements | 27 |
| REAL elements | 11 |
| PARTIAL elements | 5 |
| PLACEHOLDER elements | 11 |
| Current REAL share | 41% |
| Minimum target REAL share | 70% |
| Preferred target REAL share | 78% |
| Stretch target REAL share | 81% |

## Sprint ED-1 Checklist: High-Visibility Dead Action Cleanup

Expected delta: +18 to +25 percentage points  
Target: 16-18 REAL elements after completion

| ID | Checklist Item | Status | Evidence / Notes |
|---|---|---|---|
| ED1-01 | Dashboard header dead `Send feedback` mailto removed or replaced with real feedback pipeline | Done | Removed from `DashboardSection.tsx`; the already-real, Supabase-backed `BetaFeedbackButton`/`BetaFeedbackModal` (rendered app-wide via `AppShell.tsx`) is the one remaining path |
| ED1-02 | AI Workspace/header duplicate feedback dead mailto removed or unified if present | Done | Removed from `AIWorkspaceSection.tsx`; same floating feedback button covers this page too |
| ED1-03 | Single real feedback entry point confirmed through existing BetaFeedbackButton/BetaFeedbackModal | Done | Confirmed via code read: `BetaFeedbackButton.tsx` -> `BetaFeedbackModal.tsx` -> `betaFeedbackRepository.create` -> `POST /api/beta-feedback` -> `beta_feedback` table |
| ED1-04 | `Refresh` button wired to real dashboard metric/timeline refetch | Done | `handleRefresh()` invalidates the tenant's cached metrics entry and bumps a `refreshToken` threaded into `useLiveWorkspaceMetrics`, `useLiveRagHealth`, `useEnterpriseGoldenPath`, `useWorkflowTimeline` |
| ED1-05 | Refresh action has loading/error-safe behavior | Done | Reuses `workflowTimeline.loading` as the visible spin state; underlying hooks already fall back safely on fetch failure (pre-existing behavior, unchanged) |
| ED1-06 | `View All N` in Project Health Monitor routes to Projects & Programs | Done | Now `<a href="/projects">` |
| ED1-07 | Project row/button opens project detail route or safe project context | Done | No per-project detail route exists (Projects & Programs selects via in-page state, not URL) -- rows route to `/projects`, the honest fallback option |
| ED1-08 | `Active users` metric relabeled honestly or replaced with real count | Done | Relabeled "Team provisioning" in `workflowEvidence.ts`; value (Ready/Blocked) unchanged, now matches its label |
| ED1-09 | `Audit coverage` metric relabeled honestly or replaced with real audit count | Done | Relabeled "Audit readiness" with a detail string clarifying it is a proxy, not a literal audit-log count |
| ED1-10 | `Start guided demo` renamed/repositioned to avoid collision with `demo.triaxisventures.com` investor demo | Done | Renamed "Start guided setup"; added a `title` tooltip distinguishing it from the investor demo |
| ED1-11 | `Request pilot conversation` wired to real capture path or explicitly external/deferred | Done | Kept as `mailto:` (no lead-capture backend exists), relabeled trailing text "Email" and added a `title` tooltip marking it as an external action |
| ED1-12 | `Export Briefing` either minimally implemented or honestly disabled/deferred | Done | Real client-side JSON export (metrics, projects, priority actions) via Blob download -- no new backend |
| ED1-13 | Command search either minimally implemented or honestly disabled/relabelled | Done | New `DashboardCommandSearch` component filters real loaded projects and priority actions client-side |
| ED1-14 | No primary dashboard header action remains dead | Done | All 4 header actions (guided setup, refresh, export, search) now do something real |
| ED1-15 | Tests added/updated for dashboard action wiring | Done | `DashboardSection.test.tsx` (new, 6 tests), `useLiveWorkspaceMetrics.test.ts` (new), `liveWorkspaceMetricsCache.test.ts` (+1), `workflowEvidence.test.ts` (updated), `enterpriseComponents.test.tsx` (updated) |
| ED1-16 | Typecheck run and passing | Done | `pnpm run typecheck` exit 0 |
| ED1-17 | Lint run and passing | Done | `pnpm run lint` (`--max-warnings=0`) exit 0 |
| ED1-18 | Tests run and passing | Done | See closeout doc for exact pass/fail counts |
| ED1-19 | Build run and passing | Done | See closeout doc |
| ED1-20 | REAL/PARTIAL/PLACEHOLDER count updated after ED-1 | Done | 21/27 REAL (78%) -- see closeout doc for full recount and a flagged baseline-arithmetic discrepancy in this roadmap's own summary table vs. its itemized inventory |

## Sprint ED-1 Exit Gate

Sprint ED-1 can close only if:

- No dead dashboard header action remains.
- Project navigation is real.
- Proxy labels no longer overclaim.
- Guided demo naming is distinct from investor demo.
- Verification is run and documented.
- Updated REAL/PARTIAL/PLACEHOLDER count is recorded.

## Sprint ED-2 Checklist: Existing Infrastructure Wiring

Expected delta: +10 to +18 percentage points  
Target: at least 19/27 REAL elements after completion

| ID | Checklist Item | Status | Evidence / Notes |
|---|---|---|---|
| ED2-01 | External Signals tile uses repository data or an honest provider-gated state | Not started |  |
| ED2-02 | Social alert repository/service layer wired if scoped | Not started |  |
| ED2-03 | Golden Path pending AI review count uses literal AI review count or honest fallback | Not started |  |
| ED2-04 | Tenant Health Command Center pending AI review count uses literal AI review count or honest fallback | Not started |  |
| ED2-05 | Audit coverage uses real audit count or formally named proxy | Not started |  |
| ED2-06 | `getDashboardProjects()` fabricated budget/spent fields removed or replaced | Not started |  |
| ED2-07 | Recent institutional activity is live or honestly empty, not fake | Not started |  |
| ED2-08 | Dashboard tests cover AI review counts | Not started |  |
| ED2-09 | Dashboard tests cover External Signals behavior | Not started |  |
| ED2-10 | Dashboard tests cover budget/spent no-fabrication behavior | Not started |  |
| ED2-11 | Typecheck run and passing | Not started |  |
| ED2-12 | Lint run and passing | Not started |  |
| ED2-13 | Tests run and passing | Not started |  |
| ED2-14 | Build run and passing | Not started |  |
| ED2-15 | REAL/PARTIAL/PLACEHOLDER count updated after ED-2 | Not started |  |

## Sprint ED-2 Exit Gate

Sprint ED-2 can close only if:

- Executive Dashboard reaches at least 19/27 REAL elements.
- AI review and audit metrics are no longer misleading.
- External Signals is wired or truthfully gated.
- Fabricated budget/spent values are removed or corrected.
- Verification is run and documented.

## Sprint ED-3 Checklist: Net-New Dashboard Intelligence MVPs

Expected delta: +5 to +12 percentage points  
Target: preferred 21/27 REAL elements, stretch 22/27

| ID | Checklist Item | Status | Evidence / Notes |
|---|---|---|---|
| ED3-01 | Risk Heatmap no longer uses hardcoded module constant for live tenants | Not started |  |
| ED3-02 | Risk Heatmap uses existing project risk aggregation or honest deferred state | Not started |  |
| ED3-03 | Risk categories are generic, tenant-configurable, or explicitly product-decided | Not started |  |
| ED3-04 | Strategic Objectives has minimal tenant-scoped backend or honest deferred state | Not started |  |
| ED3-05 | AI Recommendations avoids fake AI claims | Not started |  |
| ED3-06 | AI Recommendations uses curated/admin-authored records or existing AI Review pattern | Not started |  |
| ED3-07 | Golden Path vs Pilot Onboarding checklist overlap resolved by merge/differentiate/server-persist decision | Not started |  |
| ED3-08 | Final dashboard inventory table updated | Not started |  |
| ED3-09 | 70-80% REAL target achieved or blocker documented | Not started |  |
| ED3-10 | Typecheck run and passing | Not started |  |
| ED3-11 | Lint run and passing | Not started |  |
| ED3-12 | Tests run and passing | Not started |  |
| ED3-13 | Build run and passing | Not started |  |

## Sprint ED-3 Exit Gate

Sprint ED-3 can close only if:

- Executive Dashboard reaches preferred 21/27 REAL elements or better; or
- Remaining placeholders are explicitly deferred with product rationale.

## Overall Completion Gate

The Executive Dashboard remediation program is complete only if:

| Completion Standard | Status | Evidence / Notes |
|---|---|---|
| At least 19/27 elements are REAL | Done (after ED-1) | 21/27 (78%) -- exceeds the 19/27 minimum and matches the 21/27 preferred target already, one short of the 22/27 stretch target |
| No visible dead primary dashboard actions remain | Done (after ED-1) | All 9 dead/mislabeled elements in ED-1's scope fixed; 4 remain out of ED-1 scope (External Signals, Strategic Objectives, AI Recommendations, Risk Heatmap -- ED-2/ED-3 net-new/wiring work) |
| Proxy metrics are honestly labeled | Done (after ED-1) | "Active users" -> "Team provisioning", "Audit coverage" -> "Audit readiness" |
| Investor demo and guided workflow naming are not confused | Done (after ED-1) | "Start guided demo" -> "Start guided setup", with a disambiguating tooltip |
| Dashboard actions work, navigate, refresh, export, open feedback, or are explicitly deferred | Done (after ED-1) |  |
| Verification suite passes | See closeout doc | `docs/readiness/EXECUTIVE_DASHBOARD_ED1_CLOSEOUT_2026_07_25.md` |
| Closeout documents exact before/after counts | Done | Same closeout doc |

## Progress Log

### ED-1 Progress

- Date: 2026-07-25
- Executor: Claude Code
- Files changed: see `docs/readiness/EXECUTIVE_DASHBOARD_ED1_CLOSEOUT_2026_07_25.md`
- Items completed: ED1-01 through ED1-20 (all)
- Items blocked: none
- REAL count after sprint: 21/27 (78%)
- Verification: see closeout doc for exact typecheck/lint/test/build results

### ED-2 Progress

- Date:
- Executor:
- Files changed:
- Items completed:
- Items blocked:
- REAL count after sprint:
- Verification:

### ED-3 Progress

- Date:
- Executor:
- Files changed:
- Items completed:
- Items blocked:
- REAL count after sprint:
- Verification:

