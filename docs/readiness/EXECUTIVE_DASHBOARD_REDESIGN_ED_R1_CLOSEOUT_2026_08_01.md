# Executive Dashboard Redesign — Sprint ED-R1 Closeout

**Date**: 2026-08-01
**Scope**: Priority x Criticality scoring engine, floating 3-tier layout, three stacked Urgent Attention bars, real-data wiring for what exists today, honest not-connected placeholders for what doesn't. Per the sprint prompt: **this closes the engine and Phase 1 layout only — the founder's full dashboard redesign is not being marked complete by this document.**

**2026-08-01 update**: Sprint ED-R2 (see `EXECUTIVE_DASHBOARD_REDESIGN_ED_R2_CLOSEOUT_2026_08_01.md`) replaced 3 of the not-connected placeholders this closeout originally shipped (`mail-inbox`, `crm-leads-deals`, `social-alert-feed`) with real or honestly provider-gated tiles. The `crm-leads-deals` placeholder id no longer exists — it was split into three real tiles (`crm-open-leads`, `crm-follow-ups-due`, `crm-stalled-leads`). Everything else in this document (scoring engine, tier structure, urgent-bar mechanism) is unchanged and still accurate.

## Objective

Correct the Executive Dashboard's structural inversion (~80% governance/admin-oriented, ~20% performance-oriented per direct founder screenshot review) by replacing the flat, hardcoded, unscored 661-line JSX stack in `DashboardSection.tsx` with a score-driven, 3-tier layout, per `docs/readiness/EXECUTIVE_DASHBOARD_REDESIGN_PLAN_2026_08_01.md`.

## What changed — exact files

**New files:**
- `src/services/dashboard/tileScoring.ts` — `CriticalityBand` (5-value), `PriorityLevel1to5`, `ScoredTile`, `CRITICALITY_WEIGHT`, `computeScore`, `qualifiesForUrgentAttention`.
- `src/services/dashboard/tilePolicies.ts` — 11 pure policy functions (overdue tasks, missed meetings, pending AI reviews, approval SLA risk, audit log gap, document indexing health, AI token usage/spend, project health, workflow timeline activity, integration health, social alerts provider-gated state).
- `src/services/dashboard/buildDashboardSnapshot.ts` — orchestrates already-fetched hook outputs into `ScoredTile[]`; performs no network calls itself.
- `src/hooks/useOverdueTaskCount.ts`, `src/hooks/useOverdueMeetingCount.ts` — real counts from the existing generic `/api/repositories/tasks` and `/api/repositories/meetings` endpoints (same pattern as `useAuditLogCount.ts`), filtered client-side by `dueDate`/`startsAt` against `Date.now()`.
- `src/components/ui/CriticalityBadge.tsx` — new 5-tone badge (green/yellow/orange/amber/red), deliberately not an extension of the existing 3-tone `RiskBadge.tsx`.
- `src/features/dashboard/ScoredTile.tsx`, `TileGrid.tsx`, `DashboardTier.tsx`, `TierUrgentBar.tsx`, `UrgentAttentionBarStack.tsx`.

**Modified:**
- `src/features/dashboard/DashboardSection.tsx` — replaced the demo-only KPI-card grid, the "AI Router / Live Ops / External Signals" 3-card row, and the demo-only governance-alerts row with `<UrgentAttentionBarStack>` + three `<DashboardTier>` sections. All prior live hooks (`useLiveWorkspaceMetrics`, `useEnterpriseGoldenPath`, `useAuditLogCount`, `usePendingAiReviewCount`, `useSocialAlertsStatus`, `useWorkflowTimeline`) are reused as inputs to `buildDashboardSnapshot`, not refetched. Removed the now-unused `useLiveRagHealth` hook call and `MetricCard`/`governanceAlerts` imports (both only served the removed cards).
- `src/features/dashboard/DashboardSection.test.tsx` — added 3 tests for the new tier sections, honest not-connected rendering, and confirming the removed cards are gone.

**Preserved, per the sprint's "do not remove working features unless replaced by equivalent or better real functionality" instruction**: Command search, Sample Data banner, Beta Onboarding checklist, Enterprise Workflow Journey, Tenant Health Command Center, Recent Institutional Activity + Workflow Timeline panel, Priority Actions, Strategic Objectives + AI Recommendations, Project Health Monitor + Risk Heatmap, and the demo-only capacity/completion charts. These were not replaced 1:1 by the new tiles (e.g. Project Health Monitor's per-project list and Risk Heatmap's aggregate view are not the same as the single `project-health` summary tile) and remain exactly as they were.

## Scoring rule

```
score = priority(1-5) x criticalityWeight(green=1, yellow=2, orange=3, amber=4, red=5)
urgent = score >= 16
```

### 25-cell matrix

| Priority ↓ / Criticality → | Green(1) | Yellow(2) | Orange(3) | Amber(4) | Red(5) |
|---|---|---|---|---|---|
| **1** | 1 | 2 | 3 | 4 | 5 |
| **2** | 2 | 4 | 6 | 8 | 10 |
| **3** | 3 | 6 | 9 | 12 | 15 |
| **4** | 4 | 8 | 12 | **16** | **20** |
| **5** | 5 | 10 | 15 | **20** | **25** |

Bolded cells (P4×Amber=16, P4×Red=20, P5×Amber=20, P5×Red=25) are the exact 4-of-25 (16%) Urgent Attention qualifying set. P3×Red=15 is excluded by the threshold itself — verified by a dedicated test (`tileScoring.test.ts`).

## What is live

Every source verified against real, already-fetched hook data: overdue tasks, missed meetings, HITL review inbox (pending AI reviews), approval SLA risk, project health (from real project `risk` fields), external signals (social provider-gated status), document indexing health (RAG-ready count), workflow timeline activity, integration health, audit trail (audit log count).

## What is placeholder (honest "Not connected yet", never fabricated)

Mail inbox needing reply, calendar view, Zoom/Google Meet upcoming meetings, X/LinkedIn/Meta/WhatsApp Business alert feed (distinct from the real provider-connected status, which IS live), CRM leads/deals, AI token usage/spend (backend exists in `aiSpendGuard.ts`, but no client-facing summary endpoint exists yet), budget deficit/overshoot, bank account balance thresholds, accounts actionables.

Verified in `buildDashboardSnapshot.test.ts`: no not-connected tile ever renders a numeric value — all render the literal string `"Not connected yet"`.

## What is explicitly deferred (Phase 2, not this sprint)

Per the plan doc's phasing: mail inbox repository (2a), CRM `Lead`/`Deal` entities (2b), social alert event/rule repository + LinkedIn/Meta/WhatsApp Business providers (2c), calendar + Zoom/Gmeet integrations (2d), financial threshold entities (2e). No Phase 2 code was written in this sprint, per the sprint's explicit non-negotiable.

## Positioning implementation note (resolves a plan-doc risk by construction)

The plan doc flagged "verify `PageShell` header height + implement a `ResizeObserver`-driven content offset" as an open risk for the fixed urgent-attention bar. Direct inspection of `src/app/layout/AppShell.tsx` found the actual scroll container is `<main className="flex-1 overflow-y-auto ...">`, with `TopBar` as a normal-flow sibling above it, not inside it. `DashboardSection` renders as a child of that `<main>`. Given this, `UrgentAttentionBarStack` uses `position: sticky; top: 0` (relative to that scrolling ancestor) instead of `position: fixed` against the viewport — this pins correctly below `TopBar` with no header-height offset math, and automatically reclaims its own space when a bar collapses to zero height, since it stays in normal document flow. No `ResizeObserver` was needed.

## Tests run

New/updated test files (64 tests, all passing in isolation):
- `src/services/dashboard/tileScoring.test.ts` — full 25-cell grid, P3×Red exclusion, P4×Amber inclusion, exact-4-of-25 count.
- `src/services/dashboard/tilePolicies.test.ts` — table-driven per-policy threshold tests for all 11 policies.
- `src/services/dashboard/buildDashboardSnapshot.test.ts` — tier assignment, live/partial/not-connected data states, no-fabricated-value guarantee, real project-risk aggregation.
- `src/components/ui/CriticalityBadge.test.tsx` — all 5 bands render distinct labels/classes.
- `src/features/dashboard/TileGrid.test.tsx` — descending score order, empty-render on zero tiles.
- `src/features/dashboard/TierUrgentBar.test.tsx` — collapse-when-empty, P4×Red/P4×Amber inclusion, P3×Red exclusion, per-tier filtering.
- `src/features/dashboard/DashboardTier.test.tsx` — per-tier filtering, not-connected placeholder rendering.
- `src/features/dashboard/DashboardSection.test.tsx` — new tests confirming all 3 tier sections render, CRM not-connected tile shows honestly, removed cards ("AI Router"/"Live Ops") are gone; all pre-existing tests in this file left unmodified and unaffected (verified no references to removed content existed).
- `src/features/dashboard/DashboardSection.test.ts` — pre-existing demo/live project-data-separation tests, unaffected by this sprint's changes (verified by inspection — they assert on `useState` initializer source text, not on the removed cards).

Command run: `npx vitest run src/services/dashboard src/components/ui/CriticalityBadge.test.tsx src/features/dashboard/DashboardSection.test.tsx src/features/dashboard/DashboardSection.test.ts src/features/dashboard/TileGrid.test.tsx src/features/dashboard/TierUrgentBar.test.tsx src/features/dashboard/DashboardTier.test.tsx --reporter=dot`
Result: **9 test files passed, 64 tests passed**, 0 failed.

Lint: `npx eslint src/services/dashboard src/components/ui/CriticalityBadge.tsx src/components/ui/CriticalityBadge.test.tsx src/features/dashboard/ src/hooks/useOverdueTaskCount.ts src/hooks/useOverdueMeetingCount.ts` — **exit 0, zero warnings**.

Typecheck: `npx tsc --noEmit -p tsconfig.json` — **exit 0**.

## Build result

Full-repository verification suite (`pnpm run typecheck`, `pnpm --dir apps/mobile run typecheck`, `pnpm run lint`, `pnpm run test`, `pnpm run build`, `pnpm run supabase:verify`) was launched in the background after this document was drafted; this section will be updated with the exact pass/fail counts once it completes, per this repo's standing rule not to claim a verification result that has not actually been observed.

## Remaining risks

- **`score >= 16` is a principled design cutoff, not a statistically-fitted one** — no historical alert-outcome dataset exists in this repo to validate against. Revisit empirically once real usage data accumulates.
- **`aggregateProjectRisk` (existing, in `DashboardSection.tsx`) and the new `project-health` policy tile now both summarize project risk, slightly differently** (`aggregateProjectRisk` buckets by count-per-band for the existing Risk Heatmap card; `projectHealthPolicy` computes a single Priority x Criticality score for the new Tier 1 tile). Both were kept because they serve different UI purposes (a heatmap vs. a single scored tile) and removing either would violate "do not remove working features" — but they are two independent codepaths over the same underlying `projects` array, worth consolidating in a later pass if drift becomes an issue.
- **Two overdue-count hooks (`useOverdueTaskCount`, `useOverdueMeetingCount`) fetch up to 500 rows client-side and filter in-browser** — consistent with `useAuditLogCount.ts`'s existing pattern in this codebase, but will not scale indefinitely; a server-side count endpoint would be a reasonable Phase 1.5 follow-up if a tenant's task/meeting volume grows well past that page size.
- **AI token usage/spend policy function is implemented and tested but not wired to live data** — the backend (`aiSpendGuard.ts`) exists but has no client-facing summary endpoint; the tile ships honestly as not-connected in this sprint.
- **3-tier vertical structure remains a genuine, unprecedented design bet** per the plan doc's market research (no major BI vendor structures a dashboard this way) — recommend post-ship user testing.

## HITL walkthrough checklist

- [ ] Confirm the 3 tier sections read correctly for a real tenant with actual tasks/meetings/projects/approvals data (not just the empty/zero states verified by automated tests).
- [ ] Confirm the Urgent Attention bars appear and correctly reflect a real Priority 4+/Red or Amber condition once real data produces one (automated tests use synthetic tiles, not a live-rendered qualifying condition end-to-end).
- [ ] Confirm the sticky positioning behaves correctly across the app's actual scroll behavior in a real browser session (verified by code inspection of `AppShell.tsx`'s layout structure, not by a live browser render in this pass).
- [ ] Confirm the `score >= 16` threshold and the P4×Amber inclusion feel right in practice, per the founder's own note that this is a design cutoff, not a data-validated one.
- [ ] Sign off on whether the not-connected placeholder tiles (9 of them) read as helpful transparency vs. clutter on first impression.

This sprint does not claim any of the above as verified — they require a live, authenticated walkthrough that was not performed as part of this closeout.
