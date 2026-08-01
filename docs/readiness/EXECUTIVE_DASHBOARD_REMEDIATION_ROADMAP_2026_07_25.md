# Executive Dashboard Remediation Roadmap

Date created: 2026-07-25  
Trigger: Founder instruction to generate a 70-80% delta on the Executive Dashboard current state  
Scope: Executive Dashboard, including Golden Path, Tenant Health Command Center, header actions, router/ops/signals row, recent activity, workflow timeline, priority actions, strategic objectives, AI recommendations, risk heatmap, and Project Health Monitor  
Execution model: Roadmap and checklist only. No code changes are made by this document.

## Objective

Raise the Executive Dashboard from its current state to a substantially more real, clickable, evidence-backed operating surface.

The founder-defined target is a **70-80% delta on the current state**.

For this roadmap, the measurable target is:

> Increase REAL dashboard elements from the current baseline of 11/27, or 41%, to at least 19/27, or 70%, with a stretch target of 22/27, or 81%.

This can be achieved without building every net-new dashboard feature. The roadmap prioritizes high-visibility fixes, honest labels, existing infrastructure wiring, and removal of dead affordances.

## Current Baseline

Inventory size: **27 dashboard elements**

**Baseline-arithmetic discrepancy, flagged rather than silently corrected:** this table (11/5/11 =
41%/19%/41%) does not match the itemized inventory further below, which sums to **12 REAL / 5
PARTIAL / 10 PLACEHOLDER (44%/19%/37%)** -- one row ("Pending AI reviews," item 11) is tagged "REAL
heuristic" in the itemized list but was evidently not counted as REAL in this summary table. Both
figures are recorded here rather than silently reconciled; the itemized list is used as the basis
for the post-ED-1 recount below since it is the more granular, row-by-row source.

| Tag | Count (this table) | Count (itemized list) |
|---|---:|---:|
| REAL | 11 | 12 |
| PARTIAL | 5 | 5 |
| PLACEHOLDER | 11 | 10 |

## Target State

| Target | Count | Share |
|---|---:|---:|
| Minimum acceptable REAL target | 19 / 27 | 70% |
| Preferred REAL target | 21 / 27 | 78% |
| Stretch REAL target | 22 / 27 | 81% |

## Delta Definition

An element counts as `REAL` only if:

- It is wired to live tenant data, or
- It performs a real navigation/action, or
- It displays an honest tenant-safe state backed by real repository/application logic, or
- It is explicitly and truthfully gated/deferred with no fake affordance.

An element does not count as `REAL` if:

- It is a dead button.
- It uses hardcoded demo data in live tenant mode.
- It shows a fake live badge.
- It has no onClick/action despite appearing clickable.
- It uses fabricated metrics without label clarity.
- It overclaims operational readiness.

## Exhaustive Inventory Summary

| # | Element | Tag Before ED-1 | Tag After ED-1 | ED-1 Action Taken |
|---:|---|---|---|---|
| 1 | Start guided demo | PARTIAL | **REAL** | Renamed "Start guided setup," disambiguating tooltip added |
| 2 | Send feedback header action | PLACEHOLDER | **REAL** | Dead mailto removed; real app-wide `BetaFeedbackButton` is the one path |
| 3 | Refresh | PLACEHOLDER | **REAL** | Wired to real cache-invalidate + refetch |
| 4 | Export Briefing | PLACEHOLDER | **REAL** | Real client-side JSON export of current dashboard data |
| 5 | Command search | PLACEHOLDER | **REAL** | Real client-side filter over loaded projects/priority actions |
| 6 | Golden Path widget | REAL | REAL | Preserved; now also refresh-aware |
| 7 | Golden Path pending AI reviews count | PARTIAL | PARTIAL -> **REAL** (ED-2) | ED-2: literal count from real `GET /api/ai/reviews`, threaded into `buildEnterpriseGoldenPathSnapshot` |
| 8 | Onboarding completion | REAL | REAL | Preserved |
| 9 | Active users | PARTIAL | **REAL** | Relabeled "Team provisioning" -- label now matches the Ready/Blocked value it shows |
| 10 | Documents indexed | REAL | REAL | Preserved |
| 11 | Pending AI reviews | REAL heuristic | REAL heuristic -> **REAL** (ED-2) | ED-2: was actually showing a 0/1 golden-path-step flag (`needsReviewCount`), not a review count at all -- now a real literal count via `buildTenantHealthIndicators`'s new `literalPendingAiReviews` param |
| 12 | Open tasks | REAL | REAL | Preserved |
| 13 | Approval SLA risk | REAL | REAL | Preserved |
| 14 | Integration health | REAL | REAL | Preserved |
| 15 | Audit coverage | PARTIAL | **REAL** | Relabeled "Audit readiness," detail text clarifies it is a proxy |
| 16 | AI Router tile | REAL | REAL | Preserved; now also refresh-aware |
| 17 | Live Ops tile | REAL | REAL | Preserved; now also refresh-aware |
| 18 | External Signals tile | PLACEHOLDER | PLACEHOLDER -> **REAL** (ED-2) | ED-2: new `GET /api/social-alerts/status` route, real server-evaluated provider status (Connected/Provider-gated), no fabricated count |
| 19 | Recent institutional activity | PARTIAL | PARTIAL -> **REAL** (ED-2) | ED-2: reuses already-fetched real `workflow_timeline_events` for live tenants with events; honest empty state preserved when none exist |
| 20 | Workflow timeline | REAL | REAL | Preserved; now also refresh-aware |
| 21 | Priority actions core list | REAL | REAL | Preserved |
| 22 | Request pilot conversation | PLACEHOLDER | **REAL** | Kept as mailto (no capture backend exists), relabeled "Email" with a tooltip marking it external |
| 23 | Strategic Objectives | PLACEHOLDER | PLACEHOLDER -> **REAL** (ED-3) | ED-3: derived MVP -- each real program becomes an objective card, progress = real average of that program's own linked projects, no fabricated target |
| 24 | AI Recommendations | PLACEHOLDER | PLACEHOLDER -> **REAL** (ED-3) | ED-3: derived MVP -- recommendations built from real pending AI reviews and at-risk projects already loaded on the page, labeled "Governance recommendation"/"Operational recommendation" (no autonomous-AI claim); dead buttons in both demo and live modes now navigate to real destinations |
| 25 | Risk Heatmap | PLACEHOLDER | PLACEHOLDER -> **REAL** (ED-3) | ED-3: aggregates each tenant's own real project risk levels into High/Medium/Low counts, generic (not the demo set's health-specific categories); demo mode keeps its illustrative set, clearly separated; honest empty state with 0 projects |
| 26 | Project list | REAL | REAL | Preserved |
| 27 | View All + project row buttons | PLACEHOLDER | **REAL** | Both wired to real `/projects` navigation (honest fallback, no per-project detail route exists) |

**Post-ED-1 count (itemized-list basis): 21 REAL / 2 PARTIAL / 4 PLACEHOLDER = 21/27, 78%.**
**Post-ED-2 count: 24 REAL / 0 PARTIAL / 3 PLACEHOLDER = 24/27, 89%** -- every remaining
non-REAL element (Strategic Objectives, AI Recommendations, Risk Heatmap) is PLACEHOLDER, matching
exactly ED-3's own scope; no PARTIAL elements remain.
**Post-ED-3 count: 27 REAL / 0 PARTIAL / 0 PLACEHOLDER = 27/27, 100%.** Caveat, stated deliberately
rather than left implicit: 100% REAL means no element shows fabricated live-tenant data, a dead
action, or an overclaiming label -- it does not mean every element is a fully-featured platform.
Strategic Objectives and AI Recommendations in particular are explicitly-scoped MVPs (derived from
existing programs/projects/reviews, not a full OKR or AI-generation system) per this roadmap's own
non-negotiables. Full detail: `docs/readiness/EXECUTIVE_DASHBOARD_ED3_CLOSEOUT_2026_07_25.md`.

## Cross-Cutting Risks

| ID | Risk | Required Action |
|---|---|---|
| A-53 | `getDashboardProjects()` fabricates budget/spent fields | Remove fabricated fields or replace with honest empty/real values |
| A-54 | Golden Path overlaps with localStorage-only Pilot Onboarding checklist | Product decision: merge, differentiate, or server-persist |

## Recommended Sprint Structure

This roadmap should run as **three tightly scoped remediation sprints**.

If the goal is pure speed, Sprint ED-1 and ED-2 can be combined, but they should still be reported separately to preserve evidence clarity.

## Sprint ED-1: High-Visibility Dead Action Cleanup

Expected delta: **+18 to +25 percentage points**

Target result:

- Move REAL share from 41% to roughly 59-66%.
- Remove the most embarrassing dead dashboard affordances.
- Make top-of-page actions trustworthy.

### Actionables

| ID | Action | Acceptance Criteria |
|---|---|---|
| ED1-01 | Remove dead dashboard `Send feedback` mailto | Header uses existing Supabase-backed feedback flow or removes duplicate |
| ED1-02 | Remove dead AI Workspace `Send feedback` mailto if present | Same feedback entry point is used consistently |
| ED1-03 | Wire `Refresh` | Refresh re-fetches live dashboard metrics/timeline without full reload |
| ED1-04 | Wire `View All N` | Navigates to Projects & Programs route |
| ED1-05 | Wire project rows/buttons | Opens relevant project detail route or safe project context |
| ED1-06 | Relabel `Active users` proxy | Label no longer pretends to be a user count unless real count exists |
| ED1-07 | Relabel `Audit coverage` proxy | Label reflects proxy/coverage readiness or real audit count |
| ED1-08 | Rename `Start guided demo` | Avoids confusion with `demo.triaxisventures.com` investor demo |
| ED1-09 | Decide `Request pilot conversation` behavior | Real capture path, feedback flow, or explicitly external CTA |

### Checklist

| Item | Fully done | Partial | Not done | Notes |
|---|---|---|---|---|
| Dead feedback mailto removed from dashboard | [x] | [ ] | [ ] | Real `BetaFeedbackButton`/`Modal` (app-wide) is the one remaining path |
| Duplicate/dead AI feedback mailto removed or unified | [x] | [ ] | [ ] | Same floating button covers AI Workspace |
| Refresh actually refreshes dashboard data | [x] | [ ] | [ ] | Cache-invalidate + `refreshToken` threaded through all live-metrics hooks |
| Project `View All` navigation works | [x] | [ ] | [ ] | Routes to `/projects` |
| Project row/detail navigation works | [x] | [ ] | [ ] | No detail route exists; rows route to `/projects` (honest fallback) |
| Active users label is truthful | [x] | [ ] | [ ] | Relabeled "Team provisioning" |
| Audit coverage label is truthful | [x] | [ ] | [ ] | Relabeled "Audit readiness", detail text clarifies it is a proxy |
| Guided demo naming no longer collides with investor demo | [x] | [ ] | [ ] | Relabeled "Start guided setup" |
| Pilot conversation CTA is real or honestly external | [x] | [ ] | [ ] | Kept as mailto, relabeled "Email" with a disambiguating tooltip |
| Typecheck passes | [x] | [ ] | [ ] | `pnpm run typecheck` exit 0 |
| Lint passes | [x] | [ ] | [ ] | `pnpm run lint --max-warnings=0` exit 0 |
| Tests pass | [x] | [ ] | [ ] | See `EXECUTIVE_DASHBOARD_ED1_CLOSEOUT_2026_07_25.md` for exact counts |
| Build passes | [x] | [ ] | [ ] | See closeout doc |

### Exit Criteria

Sprint ED-1 closes only if:

- No dead header action remains on the Executive Dashboard. **Met.**
- Project navigation is real. **Met.**
- Proxy metrics are honestly labeled. **Met.**
- The dashboard no longer confuses guided demo with investor demo. **Met.**
- Verification is run and documented. **Met -- see closeout doc.**

**ED-1 result: 21/27 REAL (78%), meeting this roadmap's own "preferred" target (21/27) and exceeding
the minimum (19/27) without starting ED-2 or ED-3.** Full recount, including a flagged
baseline-arithmetic discrepancy in this document's own summary table vs. its itemized inventory:
`docs/readiness/EXECUTIVE_DASHBOARD_ED1_CLOSEOUT_2026_07_25.md`.

## Sprint ED-2: Existing Infrastructure Wiring

Expected delta: **+10 to +18 percentage points**

Target result:

- Move REAL share to at least 70%.
- Close the highest-value PARTIAL items.
- Wire existing but disconnected infrastructure.

### Actionables

| ID | Action | Acceptance Criteria |
|---|---|---|
| ED2-01 | External Signals tile wiring | Uses `social_alert_events` / `social_alert_rules` repository data or honest provider-gated state |
| ED2-02 | Literal AI review count | Golden Path and THCC use real AI Review Inbox count, not `pendingApprovals / 10` |
| ED2-03 | Audit coverage improvement | Use real audit count if available, otherwise formalize proxy clearly |
| ED2-04 | Remove fabricated budget/spent values | `getDashboardProjects()` no longer fabricates budget/spent as if real |
| ED2-05 | Recent institutional activity decision | Either build live feed or keep honest empty state with no overclaim |
| ED2-06 | Dashboard tests | Tests cover new counts, labels, and external signal behavior |

### Checklist

| Item | Fully done | Partial | Not done | Notes |
|---|---|---|---|---|
| External Signals tile no longer hardcoded to useless zero | [x] | [ ] | [ ] | Real provider-gated status via new `GET /api/social-alerts/status` |
| AI Review count uses real source or documented honest fallback | [x] | [ ] | [ ] | `usePendingAiReviewCount`, real `GET /api/ai/reviews` |
| Golden Path pending AI review count is not heuristic-only | [x] | [ ] | [ ] | Literal count threaded into `buildEnterpriseGoldenPathSnapshot` |
| THCC pending AI review count is not heuristic-only | [x] | [ ] | [ ] | Also fixed a deeper bug: was showing a 0/1 step-flag, not a review count |
| Audit coverage is real or clearly named as proxy | [x] | [ ] | [ ] | Real `audit_logs` count when available, honest ED-1 proxy fallback otherwise |
| Fabricated budget/spent fields removed or fixed | [x] | [ ] | [ ] | Removed from `getDashboardProjects()` |
| Recent activity is either live or honestly empty | [x] | [ ] | [ ] | Reuses already-fetched real `workflow_timeline_events` |
| Dashboard unit tests updated | [x] | [ ] | [ ] | 4 new test files, 2 updated |
| Typecheck passes | [x] | [ ] | [ ] | exit 0 |
| Lint passes | [x] | [ ] | [ ] | exit 0, zero warnings |
| Tests pass | [x] | [ ] | [ ] | 138/138 files, 519/519 tests; 1 known low-memory infra flake, not a regression |
| Build passes | [x] | [ ] | [ ] | exit 0 |

### Exit Criteria

Sprint ED-2 closes only if:

- Executive Dashboard reaches at least **19/27 REAL elements**. **Met -- 24/27 (89%).**
- Existing infrastructure is used before net-new systems are introduced. **Met -- every ED-2 fix reused an existing repository/route/table (`ai_operation_reviews`, `audit_logs`, `getSocialAlertProviderStatus()`, `workflow_timeline_events`); nothing net-new was built.**
- No known fabricated budget/spent values remain. **Met.**
- AI review and audit metrics are no longer misleading. **Met.**

**ED-2 result: 24/27 REAL (89%), exceeding this roadmap's minimum (19/27), preferred (21/27), and
stretch (22/27) targets -- without starting ED-3.** Full detail:
`docs/readiness/EXECUTIVE_DASHBOARD_ED2_CLOSEOUT_2026_07_25.md`.

## Sprint ED-3: Net-New Dashboard Intelligence MVPs

Expected delta: **+5 to +12 percentage points**

Target result:

- Push REAL share toward 78-85%.
- Address highest-value dashboard intelligence placeholders.
- Avoid overbuilding.

### Actionables

| ID | Action | Acceptance Criteria |
|---|---|---|
| ED3-01 | Risk Heatmap MVP | Uses existing project risk levels to generate real count-by-level heatmap |
| ED3-02 | Strategic Objectives MVP | Adds minimal tenant-scoped objectives model/repository or honest deferred state |
| ED3-03 | AI Recommendations MVP | Uses curated/admin-authored recommendations or AI Review pattern, not fake AI claims |
| ED3-04 | A-54 onboarding checklist decision | Merge, differentiate, or server-persist Golden Path vs Pilot Onboarding checklist |
| ED3-05 | Dashboard evidence closeout | Documents final REAL/PARTIAL/PLACEHOLDER count |

### Checklist

| Item | Fully done | Partial | Not done | Notes |
|---|---|---|---|---|
| Risk Heatmap no longer hardcoded module constant | [x] | [ ] | [ ] | Real per-tenant project-risk aggregation for live tenants; demo mode's constant kept, clearly gated |
| Risk categories are generic or tenant-configurable, not wrongly health-specific | [x] | [ ] | [ ] | "High/Medium/Low risk projects," not the demo set's "Oxygen"/"Referral"/etc. |
| Strategic Objectives has real backend or explicit defer state | [x] | [ ] | [ ] | Derived MVP from real programs/projects (Option B); honest empty state if no programs |
| AI Recommendations avoid fake AI overclaim | [x] | [ ] | [ ] | Labeled "Governance recommendation"/"Operational recommendation," derived from real pending reviews/at-risk projects |
| Golden Path vs Pilot Onboarding overlap resolved | [x] | [ ] | [ ] | Kept both, explicitly differentiated: "Pilot Onboarding (personal checklist)," labeled local-only, points to Golden Path for tenant-wide proof |
| Final dashboard inventory updated | [x] | [ ] | [ ] | 27/27 REAL (100%) -- see closeout doc |
| 70-80% REAL target achieved or blocker documented | [x] | [ ] | [ ] | Exceeded -- 100% |
| Typecheck passes | [x] | [ ] | [ ] | exit 0 |
| Lint passes | [x] | [ ] | [ ] | exit 0, zero warnings |
| Tests pass | [x] | [ ] | [ ] | 140/140 files, 533/533 tests, exit 0 (clean run, no infra flake this pass) |
| Build passes | [x] | [ ] | [ ] | exit 0 |

### Exit Criteria

Sprint ED-3 closes only if:

- Executive Dashboard reaches preferred **21/27 REAL elements** or better; or remaining placeholders
  are explicitly deferred with product rationale and no fake affordance. **Met -- 27/27 (100%), zero
  placeholders remain.**

**ED-3 result: 27/27 REAL (100%).** Full detail, including the deliberate caveat that 100% REAL
does not mean "feature-complete platform" (Strategic Objectives/AI Recommendations are explicitly
MVP-scoped per this roadmap's own non-negotiables): `docs/readiness/EXECUTIVE_DASHBOARD_ED3_CLOSEOUT_2026_07_25.md`.

## Overall Roadmap Checklist

| Goal | Target | Status | Notes |
|---|---:|---|---|
| Baseline REAL elements | 11/27 (or 12/27 itemized-list basis) | Done | 41% (44% itemized) |
| Minimum REAL target | 19/27 | **Met (ED-1)** | 70% |
| Preferred REAL target | 21/27 | **Met (ED-1)** | 78% |
| Stretch REAL target | 22/27 | **Met (ED-2)** | 81% |
| Dead dashboard buttons removed | All | **Done** | Phase ED-1 |
| Misleading proxy labels corrected | All | **Done** | Phase ED-1/ED-2 |
| Existing disconnected infrastructure wired | Major items | **Done** | Phase ED-2 |
| Fabricated budget/spent removed | Yes | **Done** | Phase ED-2 |
| Net-new placeholders addressed | Top 3 | **Done, all 3** | Phase ED-3 |
| Verification documented | Every sprint | **Done, all 3 sprints** | Required |

## Recommended Execution Order

1. Execute Sprint ED-1 first.
2. Recount REAL/PARTIAL/PLACEHOLDER.
3. If REAL share is below 70%, execute Sprint ED-2 immediately.
4. If REAL share reaches 70-75%, decide whether to continue ED-3 now or after QA3.
5. Do not start ED-3 before ED-1 and ED-2 unless the founder explicitly prioritizes dashboard intelligence over correctness.

## Claude Code Prompt Summary

When authorized, the implementation prompt should instruct Claude Code to:

- Read this roadmap.
- Audit `src/features/dashboard/DashboardSection.tsx` and dependencies.
- Implement ED-1 first.
- Stop after ED-1 if verification fails.
- Update this document with progress.
- Produce a closeout with the new REAL/PARTIAL/PLACEHOLDER count.
- Do not overclaim hardcoded, heuristic, or proxy metrics as real.

## Completion Standard

The Executive Dashboard remediation program is considered successful only if:

- At least **19/27 elements** are REAL. **Met and exceeded -- 27/27 (100%) after ED-3.**
- No visible dead primary dashboard actions remain. **Met.**
- Proxy metrics are honestly labeled. **Met.**
- Demo/investor naming is not confused with guided workflow. **Met.**
- Dashboard actions either work, navigate, refresh, export, open feedback, or are explicitly deferred. **Met.**
- Tests and build pass. **Met -- see ED-1/ED-2/ED-3 closeout docs for exact commands and counts.**
- Closeout documents exact before/after counts. **Met.**

**Program status: complete as of ED-3 (2026-07-25).** Three sequential sprints
(`EXECUTIVE_DASHBOARD_ED1_CLOSEOUT_2026_07_25.md`, `..._ED2_...`, `..._ED3_...`) moved the Executive
Dashboard from 41% (11/27, or 44%/12/27 on the itemized-list basis this program used going forward)
REAL to 100% (27/27) REAL, with zero net-new large systems built -- every fix either removed a dead
affordance, honestly relabeled a proxy, wired existing infrastructure, or built a deliberately small
MVP explicitly scoped to avoid the roadmap's own "do not overbuild" constraints.

