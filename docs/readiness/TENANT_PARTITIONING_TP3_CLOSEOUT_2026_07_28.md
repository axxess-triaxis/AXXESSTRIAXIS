# Tenant Partitioning -- Sprint TP-3 Closeout (2026-07-28)

Date: 2026-07-28
Branch: `canonical/sprint-1-35-unified-gitlab`
Governance source: `CLAUDE.md`'s evidence-chain discipline; sprint executed per Codex's formal
"Sprint TP-3: Real Two-Tenant Proof and Non-Leakage Release Gate" prompt.
Related: `TENANT_PARTITIONING_TP1_CLOSEOUT_2026_07_28.md`, `TENANT_PARTITIONING_TP2_CLOSEOUT_2026_07_28.md`,
`PRODUCTION_DEPLOYMENT_CURRENCY_NOTE_2026_07_28.md`,
`TENANT_PARTITIONING_ISOLATION_HARNESS_RUNBOOK_2026_07_28.md`,
`TENANT_PARTITIONING_LIVE_TWO_TENANT_WALKTHROUGH_2026_07_28.md`,
`ACTIONABLES_READINESS_MATRIX.md` (A-10, A-11, A-28, A-69).

## Objective

Convert tenant isolation from "code-hardened" (TP-1/TP-2's result) to evidence-backed, without
overstating what has not actually been live-tested -- per this sprint's own explicit
non-negotiable against claiming 100% isolation or fabricating verification results.

## Deployment Status

Confirmed current, not re-verified from scratch this sprint (already recorded same-day in
`PRODUCTION_DEPLOYMENT_CURRENCY_NOTE_2026_07_28.md`, which already existed with accurate content
matching reality when checked):

| Field | Value |
|---|---|
| Project | `triaxis-www-frontend-import` |
| Production URL | `https://landing.triaxisventures.com` |
| Deployment ID | `dpl_GPQHYbu6A8PGMi8xWc9SEtkLC52Y` |
| Status | `READY` |
| Built from commit | `343620f` |

All TP-1 and TP-2 code (A-28, A-69) is live in production, not just committed.

## Harness Safety Analysis

`scripts/verify-two-tenant-isolation.mjs` is **not read-only** -- it creates real throwaway
organizations, real Supabase Auth users, and real rows across 6 tables, then attempts cross-tenant
reads/writes using real access tokens before best-effort cleanup. Per this sprint's own
non-negotiable ("do not run test harnesses against production unless strictly read-only"), this
harness does not qualify and was not run against `landing.triaxisventures.com`'s production
project. Full safety classification, environment check, and exact run commands:
`TENANT_PARTITIONING_ISOLATION_HARNESS_RUNBOOK_2026_07_28.md`.

## Harness Run Result

**Not run. Blocked on environment**, confirmed directly this sprint:
- `docker info` -- CLI present, daemon not running (`failed to connect to the docker API`).
- No linked non-production Supabase project (`supabase/.temp/project-ref` absent).
- No `SUPABASE_ACCESS_TOKEN` set.

**What was run instead**, as real, additional, Docker-free evidence: `pnpm run supabase:verify`
(a static migration/RLS-coverage check, unrelated to the write-based harness) -- **passed clean**:
27 migrations, 100 created tables, **all 100 RLS-protected**, one pre-existing warning (a
permissive `using (true)` predicate in the initial schema migration, not investigated further this
sprint). This strengthens code-level confidence that RLS exists everywhere it should; it does not
prove RLS actually blocks a real cross-tenant request, which only the harness or a live
walkthrough can.

## Live Walkthrough Checklist Status

Created: `TENANT_PARTITIONING_LIVE_TWO_TENANT_WALKTHROUGH_2026_07_28.md` -- 18 screens each for
Triaxis Ventures and NEPDSIC, plus a dedicated Investor Demo section and a recommended
cross-tenant-negative-check section. **Not executed.** Every result cell is blank, exactly as it
should be until a real HITL session performs it.

## Release Gate Added

`pnpm run test:tenant-boundaries` (new `package.json` script) -- runs the 6 test files that
directly cover tenant-boundary/non-leakage behavior from TP-1, TP-2, and pre-existing work:
- `src/features/settings/OrganizationPanel.test.tsx` (TP-1: live tenant vs demo vs missing-org states)
- `src/services/pilot/pilotAcceptanceRuntime.test.ts` (TP-2: real org name vs demo institution)
- `src/features/ai-workspace/AIWorkspaceSection.test.ts` (TP-2: demo-only RAG query gating)
- `src/repositories/supabaseEnterpriseRepositories.test.ts` (repository-level tenant scoping,
  including this sprint's cross-tenant update rejection coverage from TP-2)
- `src/app/api/rag/query/route.test.ts` (TP-2: RAG retrieval scope derivation)
- `src/app/api/ai/reviews/route.test.ts` (pre-existing: AI Review cross-tenant denial)

**38 tests, all passing** when run via `pnpm run test:tenant-boundaries`.

## Tests Added/Updated This Sprint

None new -- TP-3's scope was proof/gate infrastructure (the release gate script, the harness
runbook, the walkthrough checklist), not new code requiring new unit tests. The release gate
composes existing TP-1/TP-2 test files rather than duplicating them.

## Fixes Made

None. No new tenant-leakage defect was found during this sprint's preparation work. TP-2's audit
was already thorough for this failure class; TP-3 did not repeat a fresh code sweep.

## Files Changed

- `package.json` -- added `test:tenant-boundaries` script.
- `docs/readiness/TENANT_PARTITIONING_ISOLATION_HARNESS_RUNBOOK_2026_07_28.md` (new)
- `docs/readiness/TENANT_PARTITIONING_LIVE_TWO_TENANT_WALKTHROUGH_2026_07_28.md` (new)
- `docs/readiness/TENANT_PARTITIONING_TP3_CLOSEOUT_2026_07_28.md` (this file, new)
- `docs/readiness/ACTIONABLES_READINESS_MATRIX.md` -- A-10, A-11, A-28, A-69 updated.
- `docs/readiness/QA3_READINESS_KANBAN.md` -- TP-3 Kanban update section added.

## Verification Results

- `pnpm run typecheck` -- clean.
- `pnpm run lint` (`eslint . --max-warnings=0`) -- clean, zero warnings.
- `pnpm run test` -- **160 test files passed, 638 tests passed**, run 2026-07-28. (One earlier run
  this session hit 3 timeouts in an unrelated file, `AlertsSection.test.tsx`, plus a separate
  worker failing to start for `enterpriseOnboarding.test.ts` -- both files re-ran clean in
  isolation in 26s with zero failures, and the full suite re-ran clean end to end; the original run
  took 71 minutes against a normal ~8-13 minutes, consistent with transient resource contention on
  this machine, not a regression from any change made this sprint.)
- `pnpm run test:tenant-boundaries` (new) -- **6 test files, 38 tests, all passing.**
- `pnpm run supabase:verify` -- **passed** (27 migrations, 100/100 tables RLS-protected, 1 warning).
- `pnpm run build` -- clean, no errors.

## Actionables Moved

No actionable moved to `Yes` this sprint (correctly -- neither the harness nor the live walkthrough
actually ran). Evidence strengthened, status unchanged, on:
- **A-10**: still `Blocked`. New evidence: confirmed environment still lacks Docker/staging;
  `supabase:verify`'s clean RLS-coverage result added as supporting (not substituting) evidence.
- **A-11**: still `Blocked`. New evidence: full walkthrough checklist now exists, ready to execute.
- **A-28**: still `Yes (code + test, pending HITL live confirmation)`. New evidence: confirmed
  *deployed* to production (previously only confirmed committed).
- **A-69**: still `Yes (code + test, pending HITL live confirmation)`. Same deployment
  confirmation as A-28.

## Remaining Risks

- Neither the isolation harness nor the live two-tenant walkthrough has actually run. All tenant
  isolation confidence remains at the "code-hardened" level, not "harness-tested" or "live
  HITL-confirmed."
- The Super Admin RLS-only exemption (found in TP-2) remains unresolved -- exactly what the harness
  would prove or disprove once it can run.
- A-29 (Security tab dead buttons) and A-30 (static Permissions matrix) remain open, out of scope
  for this program's TP track (now explicitly the subject of the separate SA-1/SA-2/SA-3 roadmap).

## Exact HITL Actions Required

1. Execute `TENANT_PARTITIONING_LIVE_TWO_TENANT_WALKTHROUGH_2026_07_28.md` against
   `landing.triaxisventures.com`, signed in as Triaxis Ventures and then NEPDSIC, recording every
   row honestly (including "Does not work" if that's what's found).
2. Either enable a local Docker daemon on a machine that can run this repo, or provision a
   dedicated non-production Supabase branch/staging project (with its own service-role key), so
   `pnpm run supabase:verify:two-tenant-isolation` can actually execute per
   `TENANT_PARTITIONING_ISOLATION_HARNESS_RUNBOOK_2026_07_28.md`.

## Tenant Isolation Status -- Explicit Labels

- **Code-hardened:** Yes. Repeated, consistent evidence across TP-1/TP-2/TP-3 (shared repository
  factory scoping, RLS-backed JWT auth, 100/100 tables RLS-protected per `supabase:verify`,
  application-layer AI-review enforcement, 3 real leaks found and fixed).
- **Harness-tested:** No. Blocked on environment, not run.
- **Live two-tenant verified:** No. Checklist exists, not executed.
- **Investor-demo isolated:** Code-hardened only, same caveat -- the walkthrough's Investor Demo
  section has not been executed either, though nothing in TP-1/TP-2/TP-3's fixes altered demo-mode
  behavior (all fixes were explicitly designed to leave demo mode untouched).

## Exact File / Commit / PR / Deployment State

Branch: `canonical/sprint-1-35-unified-gitlab`. Commit and push follow immediately after this
closeout. No new production deployment in this pass -- TP-3 added no application code, only
tooling/docs, so there is nothing new to deploy.
