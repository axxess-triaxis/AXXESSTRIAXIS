# Executive Dashboard Sprint ED-1 Closeout: High-Visibility Dead Action Cleanup

Date: 2026-07-25
Planning provenance: Codex-drafted execution prompt, founder-reviewed and approved before execution
("The founder reviewed and approved the Executive Dashboard remediation roadmap and checklist
before execution"), per `CLAUDE.md`'s Planning Provenance rule.
Source docs: `docs/readiness/EXECUTIVE_DASHBOARD_REMEDIATION_ROADMAP_2026_07_25.md`,
`docs/readiness/EXECUTIVE_DASHBOARD_REMEDIATION_CHECKLIST_2026_07_25.md`

## Sprint Objective

Fix high-visibility dead actions, misleading labels, and navigation gaps on the Executive Dashboard
using mostly existing infrastructure -- no dashboard redesign, no architecture rewrite, no net-new
dashboard intelligence, no fabricated live data, no proxy metric presented as real.

## What Changed

**`src/features/dashboard/DashboardSection.tsx`**
- Removed the dead `mailto:` "Send feedback" header link. The already-real, Supabase-backed
  `BetaFeedbackButton`/`BetaFeedbackModal` (rendered app-wide via `src/app/layout/AppShell.tsx`) is
  the one remaining feedback path.
- Added `refreshToken` state and `handleRefresh()`: invalidates the tenant's cached live-metrics
  entry, then bumps a token threaded into every live-data hook on the page, forcing a real refetch.
  "Refresh" button now calls this; its icon spins while `workflowTimeline.loading` is true.
- Added `handleExportBriefing()`: a real client-side JSON export (onboarding completion, live
  metrics, priority actions, project summaries) via `Blob` + a temporary download link. No new
  backend/export service.
- Added a new local `DashboardCommandSearch` component: a real, typeable search input that filters
  the page's own already-loaded projects and priority actions client-side. Replaces
  `<CommandSearchPlaceholder />` (which was purely decorative) on this page only --
  `CommandSearchPlaceholder` itself is untouched, since it may still serve other future callers.
- Renamed "Start guided demo" to "Start guided setup," with a tooltip distinguishing it from the
  separate `investor.triaxisventures.com` product. The underlying mechanism (`useGuidedDemo`,
  `GuidedDemoBanner`) was already fully real -- only the confusing name changed.
- Relabeled "Request pilot conversation" trailing text "Open" to "Email," with a tooltip stating it
  opens an email client. Kept as `mailto:` since no lead-capture backend exists anywhere in this
  codebase (building one is net-new, out of ED-1 scope).
- "View All N" and each Project Health Monitor row now navigate to `/projects` (`<a>` instead of a
  bare `<button>` with no handler). No per-project detail route exists in this codebase (Projects &
  Programs selects a project via in-page state, not a URL) -- `/projects` is the honest option
  explicitly sanctioned by the roadmap for this case, not a fabricated deep link.

**`src/features/ai-workspace/AIWorkspaceSection.tsx`**
- Removed the second dead `mailto:` "Send feedback" header link, for the same reason as above -- the
  app-wide floating feedback button already covers this page.

**`src/services/workflows/workflowEvidence.ts`**
- Tenant Health Command Center's "Active users" tile renamed "Team provisioning": the value was
  always a Ready/Blocked proxy for whether team provisioning is unblocked, never a literal user
  count -- the id changed from `active-users` to `team-provisioning` to match.
- "Audit coverage" tile renamed "Audit readiness," with its detail text now stating explicitly that
  the value is a proxy readiness signal, not a literal audit-log query -- id changed from
  `audit-coverage` to `audit-readiness`.

**`src/hooks/liveWorkspaceMetricsCache.ts`, `useLiveWorkspaceMetrics.ts`, `useLiveRagHealth.ts`,
`useEnterpriseGoldenPath.ts`, `useWorkflowTimeline.ts`**
- Added `invalidateLiveWorkspaceMetricsCache(scope)` (deletes one tenant's cached entry, narrower
  than the existing logout-time `clearLiveWorkspaceMetricsCache()`).
- Added an optional `refreshToken` parameter to all four hooks, included in each hook's effect
  dependency array, so an explicit user-initiated refresh can force a live refetch even when `scope`
  itself has not changed.

## What Did Not Change (Explicitly Out of Scope This Pass)

- External Signals tile (still hardcoded `0`) -- scoped to ED-2 (ED2-01) per the roadmap.
- Golden Path / Tenant Health Command Center's `pendingAiReviews` heuristic
  (`Math.ceil(pendingApprovals / 10)`) -- scoped to ED-2 (ED2-02/03).
- `getDashboardProjects()`'s fabricated `budget`/`spent` fields -- scoped to ED-2 (ED2-04/06), not
  touched here since they are not currently rendered on the Dashboard itself and the roadmap
  explicitly assigned this item to ED-2.
- Recent institutional activity (demo-gated, honest empty state for real tenants, no live feed) --
  scoped to ED-2 (ED2-05/07), optional.
- Strategic Objectives, AI Recommendations, Risk Heatmap -- confirmed genuinely net-new (no backend
  anywhere), deliberately deferred to ED-3 per the roadmap's own non-negotiable ("Do not build
  net-new dashboard intelligence yet").
- No dashboard redesign or architecture rewrite, per the sprint's non-negotiables.

## What Was Verified

```
pnpm run typecheck   -> exit 0, zero errors
pnpm run lint         -> exit 0, zero warnings (--max-warnings=0)
pnpm run test         -> 135/135 test files passed, 509/509 tests passed, exit 0
pnpm run build        -> exit 0, clean production build (Turbopack), all routes compiled
```

New/updated tests (10 total, all passing): `src/features/dashboard/DashboardSection.test.tsx` (new,
6 tests -- dead mailto removed, guided-setup rename, pilot-conversation "Email" label, real command
search with an honest no-matches state, real Export Briefing Blob download, project-row navigation
to `/projects`), `src/hooks/useLiveWorkspaceMetrics.test.ts` (new, 2 tests -- refetches on
`refreshToken` change, does not refetch when nothing changes), `src/hooks/liveWorkspaceMetricsCache.test.ts`
(+1 test -- `invalidateLiveWorkspaceMetricsCache` drops only the targeted scope), `src/services/workflows/workflowEvidence.test.ts`
(updated -- asserts the renamed `team-provisioning`/`audit-readiness` ids and labels),
`src/components/enterprise/enterpriseComponents.test.tsx` (updated -- asserts "Audit readiness" text).

Delta vs. this repo's last full-suite capture (`docs/RELEASE_AND_VERIFICATION_EVIDENCE_LEDGER.md`,
128 files/449 tests, with one worker-timeout infra flake): 135 files/509 tests, clean, no timeout
this run.

## Before / After Inventory Count

Per `docs/readiness/EXECUTIVE_DASHBOARD_REMEDIATION_ROADMAP_2026_07_25.md`'s itemized 27-element
inventory (used as the basis here rather than that document's own summary-table baseline, which was
found to disagree with its itemized list by one element -- flagged in that document rather than
silently corrected):

| | REAL | PARTIAL | PLACEHOLDER | REAL share |
|---|---:|---:|---:|---:|
| Before ED-1 | 12 | 5 | 10 | 44% |
| After ED-1 | **21** | 2 | 4 | **78%** |

Nine elements moved to REAL this sprint: Start guided demo/setup, Send feedback (Dashboard header),
Refresh, Export Briefing, Command search, Active users/Team provisioning, Audit coverage/readiness,
Request pilot conversation, and the Project Health Monitor "View All"/row buttons.

**This already meets this roadmap's minimum target (19/27, 70%) and matches its preferred target
(21/27, 78%) exactly, one element short of the stretch target (22/27, 81%) -- without starting ED-2
or ED-3.**

## Remaining Dashboard Gaps

- 2 PARTIAL: the AI-review-count heuristic (Golden Path + Tenant Health Command Center), and Recent
  institutional activity (honest demo/empty split, no live feed).
- 4 PLACEHOLDER: External Signals tile, Strategic Objectives, AI Recommendations, Risk Heatmap.

All six are already scoped in the roadmap to ED-2 (first four... actually first two of the
PARTIAL items plus External Signals) or ED-3 (Strategic Objectives, AI Recommendations, Risk
Heatmap) -- nothing here is newly discovered or unscoped.

## Recommendation for ED-2

Given ED-1 alone already reaches the roadmap's preferred 21/27 target, ED-2's marginal value is
narrower than originally scoped: closing the AI-review heuristic and wiring External Signals (both
have real, mostly-existing infrastructure to connect to per the original code audit) would close 2
more PLACEHOLDER/PARTIAL items without much net-new work. Recent institutional activity and the
fabricated `budget`/`spent` fields are lower-visibility (not currently rendered) and could reasonably
be deferred alongside ED-3 if the founder prefers to stop here. Recommend confirming with the founder
whether to proceed to ED-2 now or treat 78% as sufficient pending a live HITL walkthrough of what
shipped in ED-1.

## Evidence Chain

| External signal | Product decision | Changed artifact | Verification | Status |
|---|---|---|---|---|
| Founder: Executive Dashboard is the platform mainstay, needs a 70-80% delta | Approved roadmap + ED-1 execution prompt (Codex-drafted, founder-reviewed) | `DashboardSection.tsx`, `AIWorkspaceSection.tsx`, `workflowEvidence.ts`, 4 hook files, 5 test files | typecheck/lint/test/build all clean (exit 0 each) | Done, 21/27 REAL (78%) |

## Git State

See the commit immediately following this closeout for exact hash, branch, and pushed-remote state.
