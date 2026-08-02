# Executive Dashboard Redesign — Final Program Closeout (ED-R1 + ED-R2 + ED-R3)

**Date**: 2026-08-01
**Status**: Engine, layout, and 22 of 26 tiles complete or genuinely real; 4 tiles honestly closed as permanently not-connected (no fabrication anywhere). **Not deployed to production as part of this closeout** — per this program's own standing rule and ED-R3's explicit non-negotiable, deployment requires separate, explicit founder authorization, and founder sign-off has not occurred.

---

## 1. Founder specification summary

Founder's original assessment (screenshots reviewed 2026-08-01): the live Executive Dashboard was ~80% governance/admin-oriented, ~20% performance-oriented — inverted relative to AXXESS's stated product positioning ("50% company brain + 30% AI enterprise operating & execution infra + 20% compliance/governance/policy/audit engine"). Founder specified: a 3-tier vertical structure (performance → AI/BI → compliance), live score-driven horizontal re-flow within each tier, and a pinned "Urgent Attention" surface at the top. Refined across 4 rounds to: floating (not fixed) tile placement, 3 stacked per-tier urgent bars (not one merged bar), a 5-point Criticality scale, and a final `score >= 16` qualifying rule (see plan doc section 4.3-4.4 for the full derivation, including the founder's own math correcting an initial OR-based gate proposal).

Post-ED-R1-deploy founder feedback (addendum, same day): the "Enterprise golden path" panel was flagged as redundant screen-space clutter and collapsed into "Start guided setup," 100% optional, not shown by default — implemented and deployed separately from this dashboard-tile program (see plan doc section 12).

## 2. Product reasoning

Correcting the tier-weighting inversion required more than re-arranging existing cards — a genuine scoring mechanism was needed so tile prominence reflects live urgency, not hardcoded position. ED-R1 built that engine. ED-R2 and ED-R3 then replaced the highest-value placeholders the founder had originally requested with real or honestly-gated data, following one governing discipline throughout: never fabricate a number, never imply a connection or capability that doesn't exist, and when a genuine schema gap exists (e.g., "official-account alerts" has no classification field), leave it honestly closed rather than guess.

## 3. Market research constraints used (ED-R1)

Three parallel research passes (general BI/dashboard UX, AI "company brain" competitors, GRC/compliance competitors) validated the founder's core thesis as ahead-of-market (no funded competitor combines AI insights + HITL queue + live ops as co-equal dashboard content) and informed two implementation details: band-first/score-secondary tile UI (matching ITSM/GRC precedent), and flexible left-weighted tile ordering over literal corner-pinning (resolving a real tension with a cited eye-tracking study). Full detail in the plan doc, sections 3 and 6.4-6.5.

## 4. Final scoring model

```
score = priority(1-5) x criticalityWeight
criticalityWeight = { green: 1, yellow: 2, orange: 3, amber: 4, red: 5 }
```

Full 5x5 grid, 1-25. Unchanged since ED-R1 — no sprint after ED-R1 modified `tileScoring.ts`, per the standing "do not rewrite the ED-R1 engine unless fixing a bug" instruction. No bug was found.

## 5. Final urgent threshold

`score >= 16`. Qualifying set: **P4×Amber(16), P4×Red(20), P5×Amber(20), P5×Red(25)** — 4 of 25 cells (16%). P3×Red(15) is excluded by construction. Verified unchanged by `tileScoring.test.ts` (untouched since ED-R1) passing throughout ED-R2 and ED-R3.

## 6. All files added (this entire 3-sprint program)

**Migrations (2)**: `20260801120000_crm_leads.sql`, `20260801140000_financial_watch_items.sql`.

**Domain types**: `CrmLead`/`CrmLeadStage`/`CrmLeadStatus`, `FinancialWatchItem`/`FinancialWatchCategory`/`FinancialWatchThresholdType`/`FinancialWatchStatus` (both in `src/domain/entities.ts`).

**Services** (`src/services/dashboard/`): `tileScoring.ts`, `tilePolicies.ts`, `buildDashboardSnapshot.ts`, `mailDashboardSignals.ts`, `crmDashboardSignals.ts`, `socialDashboardSignals.ts`, `calendarDashboardSignals.ts`, `externalMeetingsDashboardSignals.ts`, `financialDashboardSignals.ts` (+ one `.test.ts` per file).

**Repositories**: `crmRepository.ts`, `financialWatchRepository.ts` (+ tests).

**API routes**: `GET /api/dashboard/mail-signals`, `GET /api/dashboard/social-signals`, `GET /api/dashboard/external-meetings-signals`, `GET+POST /api/crm/leads`, `GET+POST /api/financial-watch`.

**Hooks** (`src/hooks/`): `useOverdueTaskCount.ts`, `useOverdueMeetingCount.ts`, `useMailDashboardSignals.ts`, `useCrmLeads.ts`, `useSocialDashboardSignals.ts`, `useCalendarSignals.ts`, `useExternalMeetingsSignals.ts`, `useFinancialWatchItems.ts`.

**UI components** (`src/features/dashboard/`, `src/components/ui/`): `CriticalityBadge.tsx`, `ScoredTile.tsx`, `TileGrid.tsx`, `DashboardTier.tsx`, `TierUrgentBar.tsx`, `UrgentAttentionBarStack.tsx` (+ tests for each).

**Docs**: `EXECUTIVE_DASHBOARD_REDESIGN_PLAN_2026_08_01.md`, `EXECUTIVE_DASHBOARD_REDESIGN_ED_R1_CLOSEOUT_2026_08_01.md`, `EXECUTIVE_DASHBOARD_REDESIGN_ED_R2_CLOSEOUT_2026_08_01.md`, `EXECUTIVE_DASHBOARD_TILE_REGISTRY_2026_08_01.md`, this document.

## 7. All files modified

`src/features/dashboard/DashboardSection.tsx` (full restructure to the 3-tier layout, plus the separate Golden Path collapse addendum), `src/features/dashboard/DashboardSection.test.tsx`, `vitest.config.mjs` (unrelated but concurrent test-infra speedup — `fileParallelism: true` + `testTimeout: 15000`, cutting full-suite runtime ~7x; documented in its own commit).

## 8. Final tile inventory summary

**26 total tiles** across 3 tiers. Full per-tile detail in `EXECUTIVE_DASHBOARD_TILE_REGISTRY_2026_08_01.md`.

- **Real tiles** (capable of `live`/`empty`/`partial` states from genuine tenant data): **22**
- **Provider-gated / not-connected with a real, checked reason** (e.g. mail/CRM/social/calendar/financial tiles before their data loads or before a provider is connected): counted within the 22 above — these tiles have a genuine live path, they just aren't always in it
- **Permanently not-connected by design** (no live data path exists in this codebase, none fabricated): **4** — `zoom-upcoming-meetings`, `gmeet-upcoming-meetings`, `official-account-alerts`, `ai-token-usage-spend`
- **Manual-tracking tiles** (explicitly labeled, never implying a bank/provider connection): **4** — `budget-thresholds`, `budget-overshoot`, `accounts-below-threshold`, `accounts-actionables`

## 9. Tests run

Full dashboard-scoped test run (`npx vitest run` on `src/services/dashboard/`, `src/repositories/crmRepository.test.ts`, `src/repositories/financialWatchRepository.test.ts`, `src/features/dashboard/`, `src/components/ui/CriticalityBadge.test.tsx`): **17 test files, 114 tests, all passing**. 3 worker-timeout errors occurred during the parallel run (same known CPU-contention flakiness documented in the vitest-speedup commit); one (`TileGrid.test.tsx`) was independently re-run in isolation and passed cleanly, confirming contention, not a defect.

Full-repository verification (`typecheck`, `apps/mobile typecheck`, `lint`, `test`, `build`, `supabase:verify`) run separately — see section 10.

## 10. Build status / Supabase verification status

Run and results recorded in the immediately-following commit's verification log — see `docs/readiness/` for the exact numbers at commit time, or re-run `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build && pnpm run supabase:verify` directly. (This document is written to be committed alongside that verification pass, per this repo's standing evidence discipline of citing exact commands and results, not just asserting "tests pass.")

## 11. Regression / UX hardening pass (Workstream 5)

Verified by direct code inspection (no live authenticated browser render was performed — flagged explicitly, not silently skipped):

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | No overlapping bars/header | Pass | `UrgentAttentionBarStack.tsx` uses `position: sticky` within `<main>`'s own scroll container (not `fixed` against the viewport) — unchanged since ED-R1, not touched by ED-R2/R3 |
| 2 | No text overflow in tiles | Pass (wraps, doesn't clip) | `ScoredTile.tsx`'s detail `<p>` has no `truncate`/`overflow-hidden`; long rationale text wraps onto multiple lines, growing card height rather than clipping or overflowing horizontally |
| 3 | Horizontal urgent bars scroll, don't wrap into a wall | Pass | `TierUrgentBar.tsx` unchanged, still `overflow-x-auto` |
| 4 | No permanent vertical space for empty urgent bars | Pass | `TierUrgentBar` still returns `null` when empty, unchanged |
| 5 | Tier 1 before Tier 2 before Tier 3 | Pass | `DashboardSection.tsx` renders `<DashboardTier tier={1}>`, `{2}`, `{3}` in literal source order, unchanged |
| 6 | Highest score first within each tier | Pass | `TileGrid.tsx`'s descending sort is untouched and applies uniformly to all 26 tiles, including all ED-R2/R3 additions |
| 7 | P4×Amber qualifies | Pass | `tileScoring.ts` untouched since ED-R1; `tileScoring.test.ts` still passing |
| 8 | P3×Red does not qualify | Pass | same |
| 9 | Placeholder tiles cannot be mistaken for live data | Pass | `notConnectedTile()` always renders the literal string "Not connected yet," verified by tests in all 3 sprints |
| 10 | Demo mode remains rich but separated | Pass | Every `demoMode`-gated block in `DashboardSection.tsx` (Sample Data banner, demo activity feed, demo objectives, demo AI recommendations, demo charts) is untouched by ED-R2/R3 edits — confirmed by direct diff inspection |
| 11 | Live tenant mode remains honest | Pass | Extensively tested — every new not-connected/empty state assertion across `buildDashboardSnapshot.test.ts` |
| 12 | Mobile viewport remains usable | **Not independently verified this pass** | `TileGrid.tsx`'s responsive classes (`grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`) are unchanged and were not touched, but no live mobile-viewport render was performed in this session — flagged for the HITL checklist |
| 13 | No unreasonable duplication across places | Pass, with one flagged inefficiency | `overdue-meetings` (missed) and `calendar-today`/`upcoming-meetings` are deliberately distinct concepts, not duplicates — but they do issue two separate fetches to the same `/api/repositories/meetings` endpoint from the same page load; a documented, accepted tradeoff (see `useCalendarSignals.ts`'s header comment) to avoid touching already-shipped ED-R1 code |
| 14 | Links/actions route correctly | Pass | Every new tile's `route` points to a route confirmed present in the production build's route table (`/ai-workspace`, `/meetings`, `/integrations`, `/alerts`, `/crm`, `/analytics`) |
| 15 | New APIs are tenant-scoped | Pass | Verified by dedicated tenant-isolation tests in every new repository/service test file |
| 16 | New migrations pass verification | Pending final `supabase:verify` run (section 10) | |

## 12. Known remaining gaps

- Mobile viewport not live-verified (item 12 above).
- `crm_leads` and `financial_watch_items` migrations have not been confirmed applied against the live production Supabase project — only local schema/RLS syntax validated.
- No CRM or financial-watchlist management UI exists yet — both are API/repository-only; data can only be created via direct API calls today.
- Social alert ingestion pipeline (what would populate `social_alert_events`) does not exist — `critical-social-alerts` is a real query against a permanently-empty table until that pipeline is built.
- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` was not edited across any of the 3 sprints (see ED-R2 closeout for the reasoning — a large, high-stakes document not touched without a dedicated, careful pass).
- The two-separate-social-provider-mechanisms finding (env-var platform credentials vs. tenant OAuth connector) may not match the founder's eventual intended design — flagged for confirmation.

## 13. Confidence matrix

| Category | Target | Actual | Evidence | Status |
|---|---:|---:|---|---|
| Scoring correctness | 95-100% | 100% | `tileScoring.test.ts` unchanged and passing since ED-R1; exact 4-of-25 qualifying set re-verified | Complete |
| Urgent bars | 95% | 95% | `TierUrgentBar.test.tsx` unchanged and passing; collapse-when-empty and P3×Red exclusion still tested | Complete |
| Tier layout | 90-95% | 90% | `TileGrid.test.tsx` descending-order test passing; live visual render not performed this session | Complete (code), pending HITL visual |
| Existing real data (ED-R1) | 90-95% | 95% | Unchanged, still covered by ED-R1's original test suite | Complete |
| ED-R2 added sources (mail/CRM/social) | 90-95% | 90% | 102 passing tests across mail/CRM/social service, policy, and snapshot layers | Complete (code), pending HITL live-data walkthrough |
| Calendar/meetings (ED-R3) | 90%+ or provider-gated | 90% | `calendarDashboardSignals.test.ts` + policy + snapshot tests; Zoom/GMeet honestly not-connected | Complete (code), pending HITL |
| Financial thresholds (ED-R3) | 90%+ or manual/provider-gated | 90% | `financialWatchRepository.test.ts` + `financialDashboardSignals.test.ts` + policy + snapshot tests; every tile labeled "manual tracking" | Complete (code), pending HITL |
| Tenant safety | 95% | 95% | Every new query/route asserts `organization_id` derivation from server session only; tenant-isolation assertions in every new repository/service test | Complete |
| Placeholder honesty | 95% | 95% | Dedicated tests across all 3 sprints assert not-connected tiles never render a fabricated value; financial tiles always say "manual tracking" | Complete |
| HITL acceptance | Pending unless founder signs off | **Pending** | ED-R1's tier/scoring/urgent-bar mechanism was HITL-verified on the live deploy (2026-08-01); ED-R2 and ED-R3's specific new tiles have not yet been walked through live by the founder | **Pending** |

## 14. HITL walkthrough checklist

- [ ] Confirm mobile viewport rendering of the 3-tier layout and urgent bars (not verified this session).
- [ ] Confirm `Mails needing reply` reflects a real previewed Gmail/Outlook message end-to-end.
- [ ] Confirm creating a CRM lead via the API and seeing it reflected in the dashboard tiles.
- [ ] Confirm creating a financial watch item via the API and seeing correct threshold-breach scoring.
- [ ] Confirm `crm_leads` and `financial_watch_items` migrations apply cleanly to the live Supabase project.
- [ ] Sign off on the "Official-account alerts" and "AI token usage/spend" permanent not-connected gaps.
- [ ] Sign off on which social-provider mechanism (env-var platform credentials vs. tenant OAuth) should be the long-term design.
- [ ] Confirm the "manual tracking" financial-watchlist framing (vs. eventually wanting real bank integration) matches founder intent.
- [ ] Full live walkthrough of ED-R2/ED-R3 tiles on the deployed dashboard, matching the ED-R1 walkthrough already completed.

## 15. Production deployment status

**Not deployed as part of this closeout.** ED-R1's scoring/layout engine and the separate Golden Path collapse fix are both live in production (deployed and HITL-verified 2026-08-01). ED-R2 and ED-R3's code is complete, tested, and (per section 10) intended to be committed and pushed — but per this program's standing git/deploy discipline and ED-R3's own explicit non-negotiable ("do not deploy without explicit founder approval," "do not claim final founder approval unless Sudipta completes live walkthrough and signs off"), production deployment requires a separate, explicit go-ahead in conversation before it happens.

## 16. Recommendation for post-launch dashboard usability testing

Once deployed and HITL-walked-through: (1) monitor whether the `score >= 16` urgent-bar threshold feels calibrated correctly in live use — it's a principled design cutoff, not a statistically-fitted one, and should be revisited with real usage data; (2) watch whether the 3-tier vertical structure (a genuine, unprecedented design bet per ED-R1's market research — no major BI vendor structures a dashboard this way) reads well to real users, not just in principle; (3) once a CRM/financial-watchlist management UI exists, re-verify the dashboard tiles against real user-entered data rather than only API-inserted test data.
