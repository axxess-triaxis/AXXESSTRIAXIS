# Investor EOD Sync + Demo Freshness -- Closeout (2026-10-29)

Branch: `feat/investor-eod-sync` (from `origin/main` at `6c80277`). Status: **PR open, not merged, no
deploy, no scheduled or dispatched run yet.**

## External signal

Founder, 2026-10-29, verbatim: "investor.triaxisventures.com is lagging far behind
landing.triaxisventures.com. Bring the to par and set a rule that investor version auto-syncs to live
version on landing at every EOD".

## Research findings (read-only, 2026-10-29)

| Domain | Vercel project | Deployment (at ~17:00 IST) | Commit (deployment `meta.githubCommitSha`) |
|---|---|---|---|
| landing.triaxisventures.com | `triaxis-www-frontend-import` | `dpl_99mxLjMhPEBewZnGKE6Q6ughwKy9` (2026-10-25 22:25 IST) | `8fe2f251` |
| investor.triaxisventures.com | `triaxis-product-investor-demo` | `dpl_HuoHfc5ytRTVNDxMTCbXh7DJU7WM` (2026-10-25 22:27 IST) | `8fe2f251` |

Sources: `vercel inspect <domain>`, `vercel api /v13/deployments/<id>`. Both were deployed by GitHub
Actions run 40213847230 (`deploy-production.yml`). Sidebar navigation was identical on both (19 items).

1. **Code lag was zero.** Investor was not behind landing's code at the time of the request.
2. **Why investor looked months behind:** `src/demo/demoDataset.ts` pinned `baseDate` to
   `2026-07-04T08:30:00.000Z`. Every seeded task, meeting and document was dated June-Aug 2026. Seen
   live on investor `/tasks`: due dates 06-18 ... 08-05.
3. **Display bug:** the Tasks list Due Date column used `dueDate.slice(5)`, written for `YYYY-MM-DD`;
   for full ISO timestamps it rendered `06-18T08:30:00.000Z`. This affected live tenants as well.
4. **Partition (names only, no values read):** investor production env has 7 variables
   (`NEXT_PUBLIC_ANALYTICS_DISABLED`, `NEXT_PUBLIC_ANALYTICS_PROVIDER`, `NEXT_PUBLIC_APP_URL`,
   `NEXT_PUBLIC_AXXESS_DEMO_MODE`, `NEXT_PUBLIC_MIXPANEL_TOKEN`, `NEXT_PUBLIC_POSTHOG_KEY`,
   `SENTRY_AUTH_TOKEN`); landing has 53, including Supabase, Postgres, OAuth and AI provider keys.
5. **Real, transient lag observed later the same day (~18:10 IST):** landing served `6c80277`
   (`dpl_BgPrkZCgtVnyNhcxftERU9X1ghwC`, `source: git`) while investor served `1f96fc6`
   (`dpl_FFbVVqBT9ybWrJdFv92hv1cxXmJ6`, `source: cli`). The landing project also has the **Vercel Git
   integration** deploying `main` directly, ahead of (and independent of) CI, while investor only moves
   when the `deploy-production.yml` chain finishes. The `deploy-production` run for `6c80277` was still
   in progress at that time.

## What changed

| File | Change |
|---|---|
| `src/demo/demoDataset.ts` | New exported `demoBaseDate(now)`; `baseDate` is the current UTC day at 08:30 instead of the fixed 2026-07-04. All offsets were already authored relative to it. |
| `src/demo/demoMode.test.ts` | New test: `demoBaseDate` anchors to the UTC day; seeded tasks fall both before and after today. |
| `src/features/tasks/TasksSection.tsx` | Due Date column `slice(5)` -> `slice(5, 10)` (shows `MM-DD`). |
| `scripts/investor-sync-lib.mjs` | Pure sync logic: `planSync`, `evaluateChecks` (`REQUIRED_CHECKS`), `isOnMain`, `checkInvestorPartition`. |
| `scripts/investor-sync-lib.test.mjs` | Unit tests for every gate and the partition guard. |
| `scripts/investor-eod-sync.mjs` | I/O wrapper: `plan`, `guard-env <file>`, `verify <sha>`. |
| `.github/workflows/eod-investor-sync.yml` | New workflow, cron `0 18 * * *` (23:30 IST) + `workflow_dispatch` (`dry_run`, default **true**). |
| `docs/readiness/DECISION_OUTCOME_LEDGER.md` | New row `INVESTOR-EOD-SYNC`. |

### EOD sync gates (none skippable)

1. Resolve each domain's current deployment via the Vercel API and read its commit. Same commit:
   report "in sync" and stop.
2. Stand down if any `deploy-production` run is queued or in progress (it deploys investor itself; a
   sync landing after it could move investor backwards). Own concurrency group `eod-investor-sync`,
   because sharing `deploy-production` would let a queued sync cancel a queued merge deploy.
3. Landing's commit must be on `main` (GitHub compare `main...sha` is `identical` or `behind`).
4. Required check runs on that commit, latest attempt, must be `success`: `Build, Lint, Type Check`,
   `Secret Scan`, `pnpm Critical Vulnerability Gate`, `Deploy landing.triaxisventures.com`.
5. Partition guard on the pulled investor env: `NEXT_PUBLIC_AXXESS_DEMO_MODE` must be `"true"`, and no
   `SUPABASE_*`, `NEXT_PUBLIC_SUPABASE_*`, `POSTGRES_*`, `DATABASE_URL`, `*SERVICE_ROLE*`, `*_SECRET`,
   `*_SECRET_KEY`, `*_CLIENT_SECRET`, `*_API_KEY`, `AXXESS_TOKEN_VAULT_KEY`, `EMBED_FUNCTION_SECRET` names.
6. Build and deploy investor **with investor's own Vercel project env** (`VERCEL_PROJECT_ID_INVESTOR_DEMO`),
   with `--meta eodSyncSourceSha=<sha>`.
7. Post-deploy: investor domain resolves to a READY deployment carrying that commit, and `GET /` is 200.

## What did not change

- `deploy-production.yml` (merge-to-main deploys of landing, investor and lite): unchanged.
- No Vercel project setting, env var, alias or domain was changed. Landing's Vercel Git integration was
  not touched.
- Investor's demo data source and env: unchanged. The sync never reads or copies landing's env.
- Feature-by-feature demo fixture coverage for features shipped after 2026-08-24 was **not** audited.

## What was verified

Run in `C:\Users\Sudipta Sarmah\wt\axxess-investor-sync` on 2026-10-29:

| Command | Result |
|---|---|
| `pnpm run typecheck` | exit 0 |
| `pnpm --dir apps/mobile run typecheck` | exit 0 |
| `pnpm run lint` (`--max-warnings=0`) | exit 0 |
| `pnpm run supabase:verify` | exit 0 (114 RLS-protected tables; 1 pre-existing warning on `20260702165736_initial_enterprise_schema.sql`) |
| `pnpm run build` | exit 0 |
| `pnpm exec vitest run --config vitest.config.mjs --maxWorkers=2` | 331 files, 1845 tests passed |

Notes:
- The default `pnpm run test` worker pool timed out on this machine ("Timeout waiting for worker to
  respond", no tests run). This is an infra issue, not a test failure. The full suite was run with
  `--maxWorkers=2` instead; no test was skipped.
- **Live read-only dry run of the gates** (local copy of the Vercel API response via `vercel api` and
  GitHub responses via `gh api`, fed into `scripts/investor-sync-lib.mjs`), ~18:15 IST: plan =
  `deploy` (landing `6c80277`, investor `1f96fc6`); `6c80277` on main = true; required checks =
  not ok (`Deploy landing.triaxisventures.com: in_progress`); one `deploy-production` run in progress.
  So the real workflow would have stood down and would not have deployed. That is correct behavior.
- **Local demo-mode check** (`next dev` on port 3017, demo flag set in localStorage): `/tasks` due dates
  render as `10-13`, `10-17`, `10-21`, `10-25`, `10-29`, `11-02` (today 2026-10-29), with no ISO
  fragments and no hydration errors in the console.
- The workflow file itself has **not** executed in GitHub Actions (see below).

## Partial / blocked / unsupported

- **Not run in GitHub Actions yet.** `workflow_dispatch` and `schedule` only work once the file is on
  the default branch, so the first real run can only happen after the PR is merged (founder's call).
- **Demo freshness not live yet.** It reaches investor only after merge + deploy.
- **Landing's Vercel Git integration** deploys `main` without waiting for CI. This is a governance gap
  against `TEST_GOVERNANCE.md` (landing can serve a commit whose checks have not finished or failed).
  Out of scope here; it is a Vercel dashboard setting and the founder's decision.
- If the newest commit's CI landing-deploy job fails while the Git integration deployed it anyway, the
  sync will refuse to move investor (by design) and the run will fail visibly.

## Next steps (founder)

1. Review and merge the PR.
2. Approve a first `workflow_dispatch` with `dry_run: true`, then (if investor is behind) one with
   `dry_run: false`; or wait for the 23:30 IST run.
