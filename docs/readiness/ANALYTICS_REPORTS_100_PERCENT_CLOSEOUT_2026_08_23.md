# Analytics & Reports: 100% Functional Minus Deep Computation — Closeout

**Date:** 2026-08-23. **Scope:** `landing.triaxisventures.com/analytics`
(`src/features/analytics/AnalyticsSection.tsx`), founder-approved 3-sprint plan. Corresponding
readiness-matrix row: A-139 (`docs/readiness/ACTIONABLES_READINESS_MATRIX.md`).

## Operation

Investigation (Explore agent + direct Supabase migration search, 2026-08-22) found this page was
mostly a real-looking shell around hardcoded data: `okrData`/`performanceData`/`projects` came from
`institutionalRepository`, which has **no live Supabase implementation at all** — real tenants
silently got `emptyRepositories` (`[]`) instead of a real query, unlike every other page in this
codebase. Three trend arrays (`approvalCycleTrend`, `velocityTrend`, `approvedSpendTrend`) were
module-level literals never fetched in either mode. None of the 5 filter buttons or the portfolio
search box had an `onClick`/`onChange`. "Export Report" only exported whatever was currently
rendered client-side.

Database reality check (same investigation): a real `approval_requests` table exists with genuine
`created_at`/`decided_at` timestamps — approval cycle time is honestly computable from real data. A
real `projects` table exists too. **No OKR table and no budget/spend-approval table exist anywhere
in this codebase.** For those two specifically, the gap is a missing data model, not "deep
computation."

**Founder-confirmed scope (2026-08-22):** fully wire everything with a real underlying data source;
leave OKRs and budget/spend utilization as an honest "not tracked yet" state rather than inventing
new schema for them.

## Objectives (per sprint)

- **Sprint 1:** real data foundation — Projects, Risk Distribution, Approval Cycle Time; fix the
  `isDemoModeEnabled()` direct-call bug; precise per-section honest empty states.
- **Sprint 2:** interactivity — make the filter row and portfolio search actually do something
  against the now-real data.
- **Sprint 3:** real export (audit-trail-backed, filter-aware) plus full verification and this
  closeout.

## What changed

**Sprint 1** (PR #298):
- `src/features/analytics/data.ts` (new) — `getApprovalCycleTimeTrend()`, real date-arithmetic
  aggregation over `approvalRequestsRepository`, no forecasting model.
- `src/features/analytics/AnalyticsSection.tsx` — rewired to reuse `getDashboardProjects()` /
  `fetchDashboardProjectsAndPrograms()` / `aggregateProjectRisk()` from `dashboard/data.ts` for real
  Projects/Risk Distribution/Program Operations/Program Dependency Network; demo-only content now
  reads `demoRepositories` directly instead of through the `applicationServices` proxy (removes the
  same import-time-staleness risk `DashboardSection.tsx` already avoids); `useDemoModeEnabled()`
  replaces the direct `isDemoModeEnabled()` call; the single blanket "Deeper OKR, budget-trend..."
  empty state replaced with distinct per-section messages; "Provider-gated" header badge removed.
- `src/features/analytics/AnalyticsSection.test.tsx` — one test rewritten to assert the new
  per-section empty states instead of the removed blanket one.

**Sprint 2** (PR #299, based on #298):
- `AnalyticsSection.tsx` — real Project/Department/Risk-level/Time-period filter controls outside
  Demo Mode (Project+Department narrow the pie/table/network together; Risk level narrows only the
  table+network, since the pie's whole purpose is showing the risk breakdown; Time period narrows
  the Approval Cycle Time Trend); an honest disabled "Organization: this org" label instead of a
  fake dropdown, since every tenant is already single-organization-scoped via RLS. Demo Mode's own
  filter row is untouched (different data shape — no live `dept` field on demo projects).
  `project_updates` investigated as a Sprint Velocity proxy per the plan's own instruction; concluded
  it supports an "update activity" signal but not the specific "planned vs. completed" claim this
  card makes (no sprint/planning concept exists anywhere in this schema) — left honestly gapped.
- `src/app/layout/TopBar.tsx` — "Search portfolio..." now fetches real, tenant-scoped projects once
  and filters client-side, matching `DashboardCommandSearch`'s established pattern; wrapped in
  try/catch matching `loadNotifications()`'s own defensive pattern.
- `AnalyticsSection.test.tsx` / `TopBar.test.tsx` — one new test locking in the real filter controls;
  `TopBar.test.tsx`'s mock updated with a `projectsRepository` entry it didn't previously need (a
  real synchronous-crash bug was caught here — see Errors below).

**Sprint 3** (PR #300, based on #299):
- `src/app/api/analytics/export/route.ts` (new) + test — mirrors `/api/approvals/export`'s
  established pattern (RAG Remediation Sprint 3, A-60) exactly: the export file itself stays a
  client-side JSON Blob; this route's only job is writing a real, tenant-scoped audit event
  (`analytics.export_report`) for the export action.
- `AnalyticsSection.tsx`'s `handleGenerateExport()` — now POSTs that audit event (project count,
  data mode, applied filters) before downloading, wrapped so an audit-write failure never blocks the
  actual export; exports the **filtered** risk distribution/approval-cycle-trend/project list rather
  than the full unfiltered dataset — closing a gap Sprint 2 left open (the plan's own Sprint 3
  requirement, "respects whatever filters are currently applied," was not yet true after Sprint 2).

## What did not change / explicitly out of scope

- OKR Performance, Delivery Performance Trend, Budget Utilization, Cumulative Approved Spend, Sprint
  Velocity, and AI-Generated Insights remain honest "not tracked in this platform yet" states for
  real tenants — no new schema was invented for any of them, per the founder-confirmed scope.
- Demo Mode's own experience is unchanged in substance for every section (verified live, see below).
- No changes to the underlying `approval_requests`/`projects` schema, RLS policies, or any other
  page's code.

## What was verified

Per-sprint, not only at the end:

| Check | Sprint 1 | Sprint 2 | Sprint 3 |
|---|---|---|---|
| `npx tsc --noEmit` | clean | clean | clean |
| `npx eslint` | clean, 0 warnings | clean, 0 warnings (fixed 1 exhaustive-deps warning by moving a static lookup table to module scope) | clean, 0 warnings |
| `npm run build` | succeeds | succeeds | succeeds |
| Targeted `vitest run` | 9/9 | 10/10 | 14/14 |
| Live Browser-pane check | Demo mode confirmed rendering identically to pre-change (all 10 sections present, no crashes), via a temporary local `.env.local` `NEXT_PUBLIC_AXXESS_DEMO_MODE=true` override — reverted immediately after verification, never committed | — | — |

Test counts are cumulative additions to the same suite, not independent totals (Sprint 3's 14
includes Sprint 1/2's tests plus `route.test.ts` for the new export endpoint plus a re-run of
`/api/approvals/export`'s own existing test, confirming no regression to the pattern being mirrored).

## Errors caught and fixed during this pass

- **Sprint 2, TopBar.test.tsx crash:** wiring real project search into `TopBar.tsx` made it call
  `applicationServices.projectsRepository.list(scope)` unconditionally. The existing test file's own
  mock of `applicationServices` only provided `notificationsRepository`, so every TopBar test failed
  with `TypeError: Cannot read properties of undefined (reading 'list')`. Fixed two ways: the test
  mock gained a `projectsRepository` entry, and the production code itself was wrapped in try/catch
  (an async IIFE, matching `loadNotifications()`'s pattern) so a real repository failure can't crash
  the header in production either — not just in tests.
- **Git isolation mistake, mid-Sprint-2:** the TopBar edit was accidentally made while still checked
  out on the founder's own in-progress branch (`docs/duns-resolved-outcast-rejection`) instead of a
  feature branch. Caught immediately via `git status`/`git branch --show-current` before any commit;
  recovered via `git stash` (pathspec-scoped to just the misfiled file) and moved to a proper branch
  without disturbing the founder's own uncommitted work. This is also the reason Sprint 2 and Sprint
  3 were built inside dedicated `git worktree` checkouts (`.cache/worktrees/analytics-sprint-2`,
  `.cache/worktrees/analytics-sprint-3`, both removed after their branches were pushed) rather than
  the founder's own working directory — a stronger structural fix than relying on remembering to
  check the branch every time.

## What remains partial or blocked

- **No fully authenticated live-tenant walkthrough.** All three sprints' real-data code paths
  (project/approval fetch, filters, export) have been exercised via this repo's existing
  unauthenticated-401 test path, which proves the empty-state/no-crash behavior for a session-less
  request but not against a real Supabase tenant with actual projects/approvals in it. No Supabase
  test credentials were available in this session.
- **None of PR #298/#299/#300 are merged to `main` as of this closeout.**
- Sprint 2/3's filter and export behavior has not been visually confirmed live in the Browser pane
  (only Demo Mode was — the real-tenant filter UI was verified via `AnalyticsSection.test.tsx`'s
  `getByLabelText` assertions and typecheck/build, not a rendered screenshot).

## What claim is still unsupported

- Whether the real Project/Department/Risk/Time-period filters produce correct results against a
  tenant with a non-trivial number of real projects and a real approval history — the logic is
  unit-tested against the shape of the data, not against a populated live dataset.

## Exact files changed

- `src/features/analytics/AnalyticsSection.tsx` (all 3 sprints)
- `src/features/analytics/data.ts` (new, Sprint 1)
- `src/features/analytics/AnalyticsSection.test.tsx` (Sprints 1, 2)
- `src/app/layout/TopBar.tsx` (Sprint 2)
- `src/app/layout/TopBar.test.tsx` (Sprint 2)
- `src/app/api/analytics/export/route.ts` (new, Sprint 3)
- `src/app/api/analytics/export/route.test.ts` (new, Sprint 3)
- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` (A-139, this closeout's own commit)

## Exact commits / branches / PRs

- `feat/analytics-sprint-1-real-data` → PR #298 (base: `main`)
- `feat/analytics-sprint-2-interactivity` → PR #299 (base: `feat/analytics-sprint-1-real-data`)
- `feat/analytics-sprint-3-export-and-closeout` → PR #300 (base: `feat/analytics-sprint-2-interactivity`)

## Outcome

Analytics & Reports now serves real, tenant-scoped Projects/Risk Distribution/Program
Operations/Dependency Network/Approval Cycle Time with working filters, a working portfolio search,
and a real audit-trailed, filter-aware export — for every section with an actual underlying data
model. OKRs and budget/spend utilization are honestly gapped, named individually, rather than
fabricated or left under one vague callout. Not yet merged or exercised against a live authenticated
tenant — the next concrete step, alongside merging the three stacked PRs.
