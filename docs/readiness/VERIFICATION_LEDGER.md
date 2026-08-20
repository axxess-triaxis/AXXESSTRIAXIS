# Cumulative Verification Ledger

Governed by: `CLAUDE.md` (Verification Discipline). Created 2026-08-20. Where
`docs/readiness/CI_DEPLOYMENT_LEDGER.md` tracks CI/deploy runs, this file tracks actual test-suite
executions and their exact results, so a claim like "N tests passed" is always traceable to a specific
command and run.

| Date | Issue/PR | Commands | Result | Test count | Artifact | Commit |
|---|---|---|---|---|---|---|
| 2026-08-17 | #264 (Product Analytics real data) | `vitest run ProductAnalyticsSection.test.tsx`, `vitest run module-usage-events/route.test.ts` | PASS | 13/13, 5/5 (18/18 combined) | `docs/readiness/EVIDENCE_INDEX.md` row `PROD-ANALYTICS-REAL-DATA` | `20260817130000_module_usage_events.sql` + route/component changes |
| 2026-08-17 | #266 (invitation-email diagnostic log) | `npx vitest run src/services/email/invitationEmail.test.ts --exclude '**/.claude/**'` | PASS | 4/4 | `docs/readiness/EVIDENCE_INDEX.md` row `INVITE-EMAIL-DIAG` | `916cc6b` |

## Cumulative totals (verified, not estimated)

As of 2026-08-20:

- **291** Vitest test files tracked in git (`git ls-files | grep -E '\.test\.(ts\|tsx)$' | wc -l`)
- **14** Playwright spec files tracked in git (`git ls-files | grep -E 'tests/e2e/.*\.spec\.ts$' | wc -l`)
- Individual test-case count across all 291 files is **not enumerated here**. Paxel's recommendation
  suggested citing "1,450+ tests passed" as a cumulative total; that number was not independently
  reproduced in this pass and is not repeated as fact per `CLAUDE.md`'s "do not inflate claims" rule. The
  next full, clean `pnpm run test` run (outside the documented pre-existing Vitest worker-crash flake --
  see `docs/readiness/FAILED_OR_TIMED_OUT_CHECKS.md`) should have its final summary line pasted here
  verbatim to establish a real, citable total.

## How to add a row

Only add rows for suites actually run and observed, with the literal result line (`Test Files N passed
(N)` / `Tests N passed (N)` from vitest, or the Playwright summary line) -- not a restatement.
