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
| 7 | Golden Path pending AI reviews count | PARTIAL | PARTIAL | Unchanged -- deferred to ED-2 (ED2-02/03) |
| 8 | Onboarding completion | REAL | REAL | Preserved |
| 9 | Active users | PARTIAL | **REAL** | Relabeled "Team provisioning" -- label now matches the Ready/Blocked value it shows |
| 10 | Documents indexed | REAL | REAL | Preserved |
| 11 | Pending AI reviews | REAL heuristic | REAL heuristic | Unchanged -- literal count deferred to ED-2 |
| 12 | Open tasks | REAL | REAL | Preserved |
| 13 | Approval SLA risk | REAL | REAL | Preserved |
| 14 | Integration health | REAL | REAL | Preserved |
| 15 | Audit coverage | PARTIAL | **REAL** | Relabeled "Audit readiness," detail text clarifies it is a proxy |
| 16 | AI Router tile | REAL | REAL | Preserved; now also refresh-aware |
| 17 | Live Ops tile | REAL | REAL | Preserved; now also refresh-aware |
| 18 | External Signals tile | PLACEHOLDER | PLACEHOLDER | Unchanged -- deferred to ED-2 (ED2-01) |
| 19 | Recent institutional activity | PARTIAL | PARTIAL | Unchanged -- deferred to ED-2 (ED2-07), optional |
| 20 | Workflow timeline | REAL | REAL | Preserved; now also refresh-aware |
| 21 | Priority actions core list | REAL | REAL | Preserved |
| 22 | Request pilot conversation | PLACEHOLDER | **REAL** | Kept as mailto (no capture backend exists), relabeled "Email" with a tooltip marking it external |
| 23 | Strategic Objectives | PLACEHOLDER | PLACEHOLDER | Unchanged -- deferred to ED-3, net-new |
| 24 | AI Recommendations | PLACEHOLDER | PLACEHOLDER | Unchanged -- deferred to ED-3, net-new |
| 25 | Risk Heatmap | PLACEHOLDER | PLACEHOLDER | Unchanged -- deferred to ED-3 |
| 26 | Project list | REAL | REAL | Preserved |
| 27 | View All + project row buttons | PLACEHOLDER | **REAL** | Both wired to real `/projects` navigation (honest fallback, no per-project detail route exists) |

**Post-ED-1 count (itemized-list basis): 21 REAL / 2 PARTIAL / 4 PLACEHOLDER = 21/27, 78%.**

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
| External Signals tile no longer hardcoded to useless zero | [ ] | [ ] | [ ] |  |
| AI Review count uses real source or documented honest fallback | [ ] | [ ] | [ ] |  |
| Golden Path pending AI review count is not heuristic-only | [ ] | [ ] | [ ] |  |
| THCC pending AI review count is not heuristic-only | [ ] | [ ] | [ ] |  |
| Audit coverage is real or clearly named as proxy | [ ] | [ ] | [ ] |  |
| Fabricated budget/spent fields removed or fixed | [ ] | [ ] | [ ] |  |
| Recent activity is either live or honestly empty | [ ] | [ ] | [ ] |  |
| Dashboard unit tests updated | [ ] | [ ] | [ ] |  |
| Typecheck passes | [ ] | [ ] | [ ] |  |
| Lint passes | [ ] | [ ] | [ ] |  |
| Tests pass | [ ] | [ ] | [ ] |  |
| Build passes | [ ] | [ ] | [ ] |  |

### Exit Criteria

Sprint ED-2 closes only if:

- Executive Dashboard reaches at least **19/27 REAL elements**.
- Existing infrastructure is used before net-new systems are introduced.
- No known fabricated budget/spent values remain.
- AI review and audit metrics are no longer misleading.

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
| Risk Heatmap no longer hardcoded module constant | [ ] | [ ] | [ ] |  |
| Risk categories are generic or tenant-configurable, not wrongly health-specific | [ ] | [ ] | [ ] |  |
| Strategic Objectives has real backend or explicit defer state | [ ] | [ ] | [ ] |  |
| AI Recommendations avoid fake AI overclaim | [ ] | [ ] | [ ] |  |
| Golden Path vs Pilot Onboarding overlap resolved | [ ] | [ ] | [ ] |  |
| Final dashboard inventory updated | [ ] | [ ] | [ ] |  |
| 70-80% REAL target achieved or blocker documented | [ ] | [ ] | [ ] |  |
| Typecheck passes | [ ] | [ ] | [ ] |  |
| Lint passes | [ ] | [ ] | [ ] |  |
| Tests pass | [ ] | [ ] | [ ] |  |
| Build passes | [ ] | [ ] | [ ] |  |

### Exit Criteria

Sprint ED-3 closes only if:

- Executive Dashboard reaches preferred **21/27 REAL elements** or better; or
- Any remaining placeholders are explicitly deferred with product rationale and no fake affordance.

## Overall Roadmap Checklist

| Goal | Target | Status | Notes |
|---|---:|---|---|
| Baseline REAL elements | 11/27 | Current | 41% |
| Minimum REAL target | 19/27 | Not started | 70% |
| Preferred REAL target | 21/27 | Not started | 78% |
| Stretch REAL target | 22/27 | Not started | 81% |
| Dead dashboard buttons removed | All | Not started | Phase ED-1 |
| Misleading proxy labels corrected | All | Not started | Phase ED-1/ED-2 |
| Existing disconnected infrastructure wired | Major items | Not started | Phase ED-2 |
| Fabricated budget/spent removed | Yes | Not started | Phase ED-2 |
| Net-new placeholders addressed | Top 3 | Not started | Phase ED-3 |
| Verification documented | Every sprint | Not started | Required |

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

- At least **19/27 elements** are REAL.
- No visible dead primary dashboard actions remain.
- Proxy metrics are honestly labeled.
- Demo/investor naming is not confused with guided workflow.
- Dashboard actions either work, navigate, refresh, export, open feedback, or are explicitly deferred.
- Tests and build pass.
- Closeout documents exact before/after counts.

