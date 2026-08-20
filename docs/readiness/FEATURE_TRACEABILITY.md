# Feature Traceability

Governed by: `docs/readiness/EVIDENCE_INDEX.md` (this file is the feature-specific slice of that index).
Created 2026-08-17. This repo has **123** commits matching a `feat` conventional-commit prefix on `main`
(verified via `git log origin/main --oneline --grep="^feat" -E | wc -l`, 2026-08-17 -- Paxel's message
cited "150 feature commits"; the verified count is 123, and this document uses the verified figure).

## Row schema

| Feature | Origin decision | Plan | Feature commit(s) | Tests | Deploy proof | Closeout |
|---|---|---|---|---|---|---|

## Seeded entries (verified this session, 2026-08-17)

| Feature | Origin decision | Plan | Feature commit(s) | Tests | Deploy proof | Closeout |
|---|---|---|---|---|---|---|
| Product Analytics real Activation Funnel + Most Used Modules | Founder: "Build real integrations" for the two 100%-fabricated placeholder sections on `/admin/product-analytics` | `~/.claude/plans/squishy-sprouting-plum.md` (session plan mode output) | `20260817130000_module_usage_events.sql`, `src/app/api/module-usage-events/route.ts`, `ProductAnalyticsSection.tsx` changes (squashed into PR #264) | `ProductAnalyticsSection.test.tsx` 13/13, `module-usage-events/route.test.ts` 5/5 | Vercel production deploy confirmed via `vercel inspect`; live 307 checks on `landing.triaxisventures.com`, `investor.triaxisventures.com` | Not filed as a standalone closeout -- PR #264 description + `docs/readiness/EVIDENCE_INDEX.md` row `PROD-ANALYTICS-REAL-DATA` |
| AI Workspace conversation memory (Sprint 4) | Sprint 4 scope, prior session | Not re-verified this session (predates this session's active work) | PR #253 (merged this session, continuation of prior authorization) | Existing suite + one stale-assertion fix (`route.test.ts` 3/3) | Merged via PR #253; not independently re-verified live this session | Not re-audited this pass -- out of scope for this governance-scaffold session |

## Note on full historical backfill

The remaining ~121 `feat`-prefixed commits on `main` predate this traceability table and are not
individually backfilled here, for the same reason stated in
`docs/readiness/BUG_FIX_TRACEABILITY.md` -- re-deriving decisions and plans for untracked historical
commits would invent evidence rather than record it. `git log --oneline --grep="^feat"` against `main`
is the authoritative raw list for future lookups.
