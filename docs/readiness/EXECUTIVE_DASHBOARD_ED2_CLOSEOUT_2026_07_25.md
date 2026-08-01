# Executive Dashboard Sprint ED-2 Closeout: Existing Infrastructure Wiring

Date: 2026-07-25
Planning provenance: Codex-drafted execution prompt, founder-reviewed and approved before execution,
per `CLAUDE.md`'s Planning Provenance rule.
Source docs: `docs/readiness/EXECUTIVE_DASHBOARD_REMEDIATION_ROADMAP_2026_07_25.md`,
`docs/readiness/EXECUTIVE_DASHBOARD_REMEDIATION_CHECKLIST_2026_07_25.md`,
`docs/readiness/EXECUTIVE_DASHBOARD_ED1_CLOSEOUT_2026_07_25.md`

## Sprint Objective

Wire existing but disconnected infrastructure into the Executive Dashboard -- no large new systems,
reuse existing repositories/tables/hooks/UI paths wherever possible -- to push the dashboard from
ED-1's 21/27 (78%) REAL toward at least 19/27 (already exceeded by ED-1) with a preferred 21/27.

## ED-1 Carryover Gate

Checked against `docs/readiness/EXECUTIVE_DASHBOARD_ED1_CLOSEOUT_2026_07_25.md`: all 9 ED-1 items
(feedback mailto, refresh, project nav, active users/audit coverage relabel, guided demo rename,
pilot conversation, export briefing, command search) were marked Done, verified clean
(typecheck/lint/test/build), and committed/pushed (`c306914`) before ED-2 work began. No carryover
fixes were needed.

## What Changed

**`src/hooks/usePendingAiReviewCount.ts`** (new) -- fetches the real, authenticated, tenant-scoped
`GET /api/ai/reviews` (the same endpoint the AI Review Inbox itself uses) and counts items with
`status === "pending"`. Replaces the `pendingApprovals / 10` heuristic previously used for the
Golden Path step's own displayed count.

**`src/hooks/useEnterpriseGoldenPath.ts`** -- added an optional `pendingAiReviewsOverride` parameter,
passed straight through to `buildEnterpriseGoldenPathSnapshot`'s existing `pendingAiReviews` input
(which already supported an override -- it was simply never supplied by any caller until now).

**`src/services/workflows/workflowEvidence.ts`** -- `buildTenantHealthIndicators()` gained two new
optional parameters:
- `literalPendingAiReviews`: when provided, used for the "Pending AI reviews" tile's value/tone
  instead of `snapshot.needsReviewCount`. This closes a deeper bug found while implementing this
  fix: `needsReviewCount` only ever reflects whether the golden path's single "human-review" step is
  flagged (0 or 1) -- it was never a real review-item count, even before ED-1/ED-2, and would have
  stayed wrong even if the Golden Path step's own heuristic were fixed in isolation.
- `literalAuditLogCount`: when provided, used for the "Audit readiness" tile's value/tone instead of
  the ED-1 proxy heuristic (unread notifications or onboarding completion >= 70%).
- Both parameters are optional and additive -- omitting either preserves the prior (ED-1) behavior
  exactly, so no existing caller or test needed to change beyond the ones deliberately extended below.

**`src/components/enterprise/TenantHealthCommandCenter.tsx`** -- added `pendingAiReviewsCount` and
`auditLogCount` props, passed through to `buildTenantHealthIndicators`.

**`src/hooks/useAuditLogCount.ts`** (new) -- fetches the real, authenticated, tenant-scoped
`GET /api/repositories/audit_logs?pageSize=500` (the same generic resource route other tenant-scoped
list views use) and returns the row count. Returns `undefined` until the first successful response
(distinguishing "not loaded yet" from "genuinely zero"); a failed fetch or non-ok response leaves it
`undefined` rather than reporting a false zero.

**`src/app/api/social-alerts/status/route.ts`** (new) -- `GET`, authenticated. Calls the pre-existing,
real `getSocialAlertProviderStatus()`/`socialAlertsEnabled()` functions (`src/services/alerts/socialAlerts.ts`)
server-side, where `process.env` can actually see the real provider credentials
(`X_BEARER_TOKEN`, `META_APP_ID`, etc.). Returns `{ enabled, providers, anyLiveProviderConfigured }`.
Noted for the record: `src/features/alerts/AlertsSection.tsx` currently calls these same functions
directly from a client component, where `process.env` cannot see the real server environment --
this route is the technically correct place to evaluate them; `AlertsSection.tsx` itself was not
touched (out of this sprint's scope).

**`src/hooks/useSocialAlertsStatus.ts`** (new) -- fetches the route above.

**`src/features/dashboard/DashboardSection.tsx`**:
- Wires `usePendingAiReviewCount`, `useAuditLogCount`, `useSocialAlertsStatus`, all keyed to the
  existing `refreshToken` state so the "Refresh" button (ED-1) also refreshes these three new values.
- "External Signals" tile: shows a real "Connected"/"Provider-gated" badge and, when no live
  provider is configured, `"--"` instead of the previous hardcoded `0` (which could never change
  regardless of real configuration) plus real connect-instruction copy.
- "Recent institutional activity": for live tenants, now renders the same real
  `workflow_timeline_events` data already fetched for the adjacent Workflow Timeline panel (mapped
  into the `ActivityFeed` component's shape) when events exist, falling back to the existing honest
  empty state when none do. No new fetch. Demo mode unchanged.

**`src/features/dashboard/data.ts`** -- `getDashboardProjects()` no longer fabricates `budget`/`spent`
string fields (`index === 0 ? "$12.4M" : ...`). No real project-budget field exists anywhere in this
codebase's data model, and no consumer of this function rendered these fields (confirmed via test).

## What Did Not Change (Explicitly Out of Scope This Pass)

- Strategic Objectives, AI Recommendations, Risk Heatmap -- confirmed net-new (no backend anywhere),
  deliberately deferred to ED-3 per the roadmap.
- A full `social_alert_events` ingestion repository/live alert count -- bigger than this sprint's
  scope, and no live X/Facebook credentials are configured in this environment to test a live feed
  against regardless. The honest provider-gated status is the sanctioned ED-2 outcome for this item.
- `AlertsSection.tsx`'s own client-side call to `getSocialAlertProviderStatus()` (a pre-existing,
  separate quirk noted above, not something ED-2 was scoped to fix) was left untouched.
- No dashboard redesign or architecture rewrite, per the sprint's non-negotiables.

## What Was Verified

```
pnpm run typecheck   -> exit 0, zero errors
pnpm run lint         -> exit 0, zero warnings (3 react-hooks/exhaustive-deps warnings found and fixed during this pass)
pnpm run test         -> 138/138 test files passed, 519/519 tests passed, plus 1 known infra flake (see below)
pnpm run build        -> exit 0, clean production build (Turbopack), all routes compiled
```

**Test flake note:** the full-suite run hit `[vitest-pool-runner]: Timeout waiting for worker to
respond` on `src/features/dashboard/data.test.ts`'s worker thread (system free memory measured at
~404MB/7.9GB at the time -- the same low-free-RAM worker-instability pattern already documented in
`docs/RELEASE_AND_VERIFICATION_EVIDENCE_LEDGER.md`'s prior entry for `src/proxy.test.ts`, not a code
regression). `data.test.ts` was independently re-run in isolation immediately before this same full
run and passed 3/3 cleanly.

New/updated tests (10 total, all passing in isolation and in the full run): `src/hooks/usePendingAiReviewCount.test.ts`
(new, 3 tests), `src/hooks/useSocialAlertsStatus.test.ts` (new, 2 tests), `src/hooks/useAuditLogCount.test.ts`
(new, 3 tests), `src/app/api/social-alerts/status/route.test.ts` (new, 2 tests), `src/services/workflows/workflowEvidence.test.ts`
(+2 tests -- literal-override behavior for both the AI-review and audit-log tiles), `src/features/dashboard/data.test.ts`
(+1 test -- mocked repository response asserting no `budget`/`spent` keys survive).

## Before / After Inventory Count

Continuing from `docs/readiness/EXECUTIVE_DASHBOARD_ED1_CLOSEOUT_2026_07_25.md`'s itemized 27-element
basis:

| | REAL | PARTIAL | PLACEHOLDER | REAL share |
|---|---:|---:|---:|---:|
| Before ED-1 | 12 | 5 | 10 | 44% |
| After ED-1 | 21 | 2 | 4 | 78% |
| After ED-2 | **24** | **0** | **3** | **89%** |

Three elements moved to REAL this sprint: Golden Path pending AI reviews count, Tenant Health
Command Center's "Pending AI reviews" tile (which turned out to be a deeper fix than expected -- see
above), External Signals tile, and Recent institutional activity (4 items across 3 rows, since the
Golden Path step and THCC tile share one underlying fix). **Zero PARTIAL elements remain** -- every
remaining non-REAL element is PLACEHOLDER, and all three are exactly ED-3's own scope (Strategic
Objectives, AI Recommendations, Risk Heatmap).

**This exceeds this roadmap's minimum (19/27, 70%), preferred (21/27, 78%), and stretch (22/27, 81%)
targets -- without starting ED-3.**

## Remaining Dashboard Gaps

3 PLACEHOLDER elements, all confirmed (via the original ED-1 code audit) to have zero backend
anywhere in this codebase: Strategic Objectives, AI Recommendations, Risk Heatmap. These are the
only genuinely net-new feature work left in this roadmap, deliberately sequenced last.

## Recommendation for ED-3

Given ED-2 alone already reaches 89% REAL -- past every numeric target in the original roadmap --
ED-3's value is now purely about the 3 remaining placeholders, not about hitting a percentage
target. Recommend proceeding with ED-3 as scoped (MVP-only, no large analytics/OKR/risk platform),
since these three items are the last visibly "fake-looking" surfaces on the dashboard and the
roadmap's own non-negotiables already constrain scope appropriately. Confirm with the founder
whether the existing Golden Path vs. Pilot Onboarding checklist overlap (ED3-04) should be resolved
in the same pass or deferred, since it is a product decision, not a wiring task.

## Evidence Chain

| External signal | Product decision | Changed artifact | Verification | Status |
|---|---|---|---|---|
| ED-2 execution prompt (Codex-drafted, founder-reviewed) following ED-1's closeout | Wire existing infrastructure before building anything new | 2 new API/hook layers (AI review count, audit log count, social alert status), `workflowEvidence.ts`, `TenantHealthCommandCenter.tsx`, `DashboardSection.tsx`, `data.ts`, 6 test files | typecheck/lint/build clean (exit 0 each); tests 138/138 files, 519/519 passing with 1 documented, independently-reproduced-clean infra flake | Done, 24/27 REAL (89%) |

## Git State

See the commit immediately following this closeout for exact hash, branch, and pushed-remote state.
