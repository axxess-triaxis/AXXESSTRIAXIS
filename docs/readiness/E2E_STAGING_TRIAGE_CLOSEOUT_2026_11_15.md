# App E2E Suite on Staging - Triage Closeout (2026-11-15)

## External signal

On 2026-11-15, the app Playwright suite (`tests/e2e`) ran against staging (https://staging.triaxisventures.com, Supabase `qpbeoslikcosfytwuguf`): 13 passed, 33 failed. That run happened after `main` was merged into `staging` (`9a2b6765`), and the cross-product stack suite passed. The report for this baseline was overwritten by a later run, so the counts above come from the session that started this work (founder-side run, source artifact not kept).

Only the golden-path and pilot-acceptance specs run in CI against a seeded database, so the other seeded specs had drifted unseen.

## What changed

PR [#504](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/504), branch `fix/e2e-staging-triage`, also merged into `staging` as `94b003c4` (deployed by Vercel project `axxesstriaxis`, status success).

| Commit | Change |
| --- | --- |
| `d41898e3` | Product fix: Tasks, Projects and Meetings no longer clear their success message when the list reloads. Regression test `src/features/tasks/TasksSection.toast.test.tsx`. Opt-in Vercel bypass (`tests/e2e/vercel-bypass.setup.ts`, `playwright.config.ts`). `skipUnlessDemoTarget()` for demo-only specs. Exact selectors in `notifications` and `sprint17`. `tests/e2e/README.md`. |
| `bb0a7212` | Seeded runs use one worker. `notifications` follows click-to-navigate. `sprint17` reads "Team access". |
| `558308a1` | `knowledge-hub` "Documents" selector is exact. `logout()` helper waits for `/api/auth/logout`, and `sprint8` uses it. |
| `d8320081` | `sprint8` checks the survey-link feedback dialog. `meetings` uses a decision text unique to each run. |
| `bc2de447` | `logout()` waits for the in-place "Sign in required" screen, not a URL change. |

## Classification

| Original group | Class | Evidence | Result |
| --- | --- | --- | --- |
| 1. `investor-landing-par` (17 of its 19 tests failed) | Environment | Its header states it needs `NEXT_PUBLIC_AXXESS_DEMO_MODE=true`. Staging is not a demo build. | Skips unless the target is a demo build. CI sets the flag (`.github/workflows/playwright.yml`). |
| 2. Create toasts (tasks, projects, meetings, sprint8) | **Product bug** since Sprint 7 (`0c627eaa8`) | `loadTasks`/`loadProjects`/`loadMeetings` called `setToast(null)` in the same batch as the success toast. The unit test fails on the old code and passes with the fix. | Fixed. "Task created." and "Project created." passed on staging in run 3, after the deploy. |
| 3a. `sprint13-readiness` (2), `visual-mobile-admin` (3) | Environment | These open `/onboarding` and `/admin/*` without signing in. `src/proxy.ts` redirects those routes to `/auth` unless demo mode is on. | Skip unless the target is a demo build |
| 3b. `knowledge-hub`, `sprint17` mobile, `sprint8` Executive Dashboard | Mostly environment plus test drift | Run 1: parallel workers signed each other out (see below). `sprint17`: section renamed in `851485c9`. `knowledge-hub`: selector matched two buttons. | `sprint17` passes. `knowledge-hub` is partly blocked; see open items. |
| 4. Ambiguous selectors (2) | Test drift | Substring matches | Exact. Both pass. |
| 5. Golden path "Dibrugarh referral SLA review" | Environment, not a seed gap | It is a sample mailbox message in `src/features/integrations/IntegrationsSection.tsx`, shown only in demo mode (SA-2b). No seed file has it, by design. | Skips unless the target is a demo build. The release gate runs it with demo mode on. |

Found while triaging:

- **Sign-out ends every session of the user.** `signOutServerSide` calls Supabase `POST /logout` without `scope`, and Supabase defaults to `global`. In run 1, with 4 workers sharing the seeded accounts, tests were signed out mid-run ("Sign in required"). Seeded runs now use one worker. **Product question, not changed:** should Sign out end the user's sessions on every device?
- **Notification click now navigates** to the item (`95711aba`). The test was updated to match.
- **The feedback form became survey links** (`db7ceb40`). The test was updated to match.

## Staging runs

Target: staging only. 46 tests each run.

| Run | Branch at | Staging code | Workers | Passed | Skipped | Failed |
| --- | --- | --- | --- | --- | --- | --- |
| Baseline | `main` | `9a2b6765` | default | 13 | 0 | 33 |
| 1 | `d41898e3` | `9a2b6765` | 4 | 9 | 25 | 12 |
| 2 | `bb0a7212` | `9a2b6765` | 1 | 15 | 25 | 6 |
| 3 | `558308a1` | `94b003c4` | 1 | 14 | 25 | 7 |
| 4 | `d8320081` | `94b003c4` | 1 | 16 | 25 | 5 |
| 5 | `bc2de447` | `94b003c4` | 1 | 18 | 25 | 3 |

The 25 skips are the demo-only specs: 19 `investor-landing-par`, 2 `sprint13`, 3 `visual-mobile-admin` and 1 golden path.

Run 5 (final) failures:
- `knowledge-hub` admin: seed gap. Staging has no documents ("No documents found").
- `leads-call-queue` manager: page stayed on "Checking session". It passed in runs 1 and 2. Intermittent.
- `projects` create: the save did not finish within the 30 s test limit. It passed in runs 3 and 4. Intermittent.

Every other seeded spec passed in run 5, including both `sprint8` tests, `notifications`, `meetings`, `tasks`, `sprint17` (both), `user-admin` (all 3), `audit-logs`, `auth` (both) and `sprint29`.

Commands: each run used `playwright test --reporter=list,json` with `E2E_RUN_SEEDED=true`, `PLAYWRIGHT_BASE_URL=https://staging.triaxisventures.com` and `VERCEL_AUTOMATION_BYPASS_SECRET`. The founder typed the secret into a `Read-Host -AsSecureString` prompt, so the agent never read it.

## What was verified

At `d41898e3`:
- `pnpm run typecheck`: exit 0
- `pnpm --dir apps/mobile run typecheck`: exit 0
- `pnpm run lint`: exit 0, zero warnings
- `pnpm run test`: 373/373 files, 2249/2249 tests
- `pnpm run build`: exit 0
- `pnpm run supabase:verify`: exit 0, with one existing warning about a permissive `using (true)` predicate in `20260702165736_initial_enterprise_schema.sql`

Later commits change only `tests/e2e` and `playwright.config.ts`. Each was re-checked with `eslint --max-warnings=0 tests/e2e` and `tsc --noEmit`.

## What did not change

- No migration, seed file or staging data change.
- No production deploy.
- The sign-out scope is unchanged.

## What remains partial or blocked

- **`knowledge-hub` admin test: seed gap.** It searches, previews, archives and restores documents, but no file in `supabase/seeds/` inserts documents, so staging shows "No documents found". It needs a decision: add a documents seed, or rewrite the test to upload its own document.
- **Intermittent staging slowness.** Across runs 2 to 4, saves sometimes took more than 5 s and the form stayed on "Saving..." (tasks timed out, project toast missed). Pages also sometimes stayed on "Checking session" for more than 20 s (audit-logs in run 3, leads-call-queue in runs 4 and 5). The same tests passed in other runs. Cause not found. Next step: time `/api/repositories/*` writes and `/api/auth/session` on staging, and check whether the PGRST303 retry from #502 is firing.
- **Guest re-login in `sprint8`** failed in runs 1 to 4 for three different reasons: session revocation, then the logout race, then a wrong URL check. It passed in run 5. That is one run, so treat it as fixed but lightly evidenced.

## What claim is still unsupported

- The baseline of 13 passed / 33 failed is founder-side. Its report was overwritten, so this closeout cannot show it. Founder-stated, source artifact needed.
- No run has had zero failures on staging.

## Decision ledger

```
Decision: Specs that need a demo-mode build skip on staging; seeded specs run on one worker; the create-toast bug is fixed in the product.
Why: CI runs the demo-only specs only against demo builds. Sign-out revokes every session of a user, so parallel seeded tests sign each other out. The toast never showed to users.
What changed: PR #504 (commits listed above); merged into staging as 94b003c4.
Architecture boundary: The Vercel bypass is opt-in, and only its cookie reaches the browser, never the header.
Product boundary: The only product change is the toast fix. Sign-out scope is a founder question.
Verification: Standard suite at d41898e3. Staging went from 13 passed / 33 failed to 18 passed / 25 skipped / 3 failed (run 5).
Outcome: Partial. 3 failures remain: 1 seed gap and 2 intermittent staging slowness.
Follow-up: Documents seed decision, staging latency investigation, sign-out scope decision, merge #504 to main.
```

## Update 2026-11-18: founder decisions, PR #541

On 2026-11-15 the founder answered both open questions.

- **Sign out ends only the current device's session.** `signOutServerSide` now calls `POST /auth/v1/logout?scope=local`. The regression test in `src/auth/serverSession.test.ts` fails on the old call and passes now. Seeded e2e runs keep one worker, because the specs share seeded rows.
- **The knowledge-hub test uploads its own document.** It uploads a uniquely named markdown file, then searches, previews, archives, restores and soft-deletes it. Toasts are matched exactly, so the local-fallback path fails the test.
  - Staging run kh1: 1 passed, 1 failed. The admin page stayed on its loading state past the 5 s default.
  - `6710bdcb` gives that first load 30 s.
  - Staging run kh2: 2 passed.

Verified at `faf224df` (on `main` `e5e05bb9`):
- typecheck, mobile typecheck, lint, build and `supabase:verify`: exit 0
- tests: 379/379 files, 2315/2315 tests

Not verified:
- Sign-out on staging or production. It is not deployed.
- A full-suite staging run after this change. The run started on 2026-11-15 never finished, because its terminal was closed.

## Update 2026-11-19: full suite on staging after PR #541

The founder approved deploying to staging. `main` was merged into `staging` as `1e3c8ad3`, and Vercel project `axxesstriaxis` deployed it successfully.

| Run | Specs | Passed | Skipped | Failed | Failures |
| --- | --- | --- | --- | --- | --- |
| run7 | knowledge-hub only (an old listener took the trigger) | 0 | 0 | 2 | Admin: hit the 30 s per-test default at Restore. Guest: sign-in over 20 s |
| run8 | all 46 | 17 | 25 | 4 | knowledge-hub (Delete still saving at 5 s), projects (sign-in over 20 s), sprint17 mobile ("Organization Admin" not shown in 5 s), sprint8 ("Project created." not shown in 5 s) |
| run9 | all 46 | **20** | 25 | **1** | leads-call-queue manager: sign-in over 20 s (it passed in run8) |

The knowledge-hub admin test now has 90 s in total and waits up to 20 s for each save message.

What runs 8 and 9 show:
- **Sign-out on staging.** `auth` login/logout and the `sprint8` admin-then-guest re-login passed in both runs. So sign-out ends the session. No test shows that another device stays signed in; that is the founder's two-device check.
- **Every remaining failure is staging slowness.** Each one is a sign-in or a save that ran out of time, and each failing test passed in another run. This blocker is still open.

Left on staging: 2 test documents named "E2E knowledge doc ..." from runs 7 and 8, which stopped before their soft-delete step.
