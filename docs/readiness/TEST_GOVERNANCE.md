# Test Governance

Governed by: `CLAUDE.md` (Verification Discipline). Created 2026-08-20 per Paxel's recommendation to
make required gates explicit by change type, rather than implicit in the standard verification suite.

## Required Gates by Change Type

| Change type | Required checks |
|---|---|
| UI change | Relevant Vitest suite for the changed component/section, relevant Playwright flow if one exists, `pnpm run lint`, `pnpm run typecheck` |
| Auth/RBAC/tenant change | Relevant Vitest suite, tenant-isolation tests, Supabase/RLS verification (`pnpm run supabase:verify` or the specific `*Rls.test.ts` file), `pnpm run lint`, `pnpm run typecheck` |
| API route change | The route's own `route.test.ts`, any repository/service test it calls into, `pnpm run lint`, `pnpm run typecheck` |
| Deploy-facing change (env var, build config, CI workflow) | `pnpm run build`, the relevant GitHub Actions workflow run, a live endpoint check post-deploy |
| Docs-only change | Link/path check where the doc references real files or code (broken references are a real defect); no app test suite required unless the doc is itself generated from code |
| Mobile change | `pnpm --dir apps/mobile run typecheck`, Capacitor doctor/build check where applicable |

None of these replace the standard suite already in `CLAUDE.md` (`pnpm run typecheck`,
`pnpm --dir apps/mobile run typecheck`, `pnpm run lint` zero-warnings, `pnpm run test`, `pnpm run build`,
`pnpm run supabase:verify`) -- this table narrows which *subset* is minimally required for a given
change type when running the full suite isn't practical (e.g. a fast-turnaround production hotfix),
and names the additional checks (Playwright, RLS) that the standard suite's summary doesn't call out by
name.

## Repository size, verified 2026-08-20

These are the actual counts, computed directly from repo state -- not estimates:

- Total commits on `main`: **891** (`git rev-list --count origin/main`)
- Commits matching a `fix` conventional-commit prefix: **143** (`git log origin/main --oneline --grep="^fix" -E | wc -l`)
- Commits matching a `feat` conventional-commit prefix: **123** (same pattern, `^feat`)
- Commits matching a `docs` conventional-commit prefix: **368** (same pattern, `^docs`)
- Vitest test files tracked in git: **291** (`git ls-files | grep -E '\.test\.(ts|tsx)$' | wc -l`)
- Playwright spec files tracked in git: **14** (`git ls-files | grep -E 'tests/e2e/.*\.spec\.ts$' | wc -l`)
- Existing `docs/readiness/` documents at time of writing: **171**

**A note on Paxel's own cited figures**: Paxel's recommendation message (2026-08-20) suggested claiming
"around 880 commits" and "1,450+ tests passed and documented." The commit count is close (891 actual vs.
"around 880" -- within the stated approximation). The "1,450+ tests" figure is **not verified here** --
291 test *files* is a real, checkable number; the number of individual test *cases* across those files
was not enumerated in this pass (a full `pnpm run test` run is the way to get that number, and it is
long-running and subject to the documented pre-existing Vitest worker-crash flake -- see
`docs/readiness/FAILED_OR_TIMED_OUT_CHECKS.md`). Per `CLAUDE.md`'s own Evidence Chain rule ("do not
inflate claims"), this document uses 291 test files as the verified figure and does not repeat the
1,450+ test-case claim until it is actually computed from a clean run and cited with the run's ID.

## Where verification results get recorded

Every PR should carry its own results (see `.github/PULL_REQUEST_TEMPLATE.md`'s Evidence section).
Cumulative, cross-PR verification history lives in `docs/readiness/VERIFICATION_LEDGER.md`.
