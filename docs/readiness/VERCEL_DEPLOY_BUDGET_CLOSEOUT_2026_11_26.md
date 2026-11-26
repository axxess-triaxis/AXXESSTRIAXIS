# Vercel Deploy Budget Closeout (2026-11-26)

## Why

The account is on Vercel's free plan, which allows at most 100 deployments a day across the whole account.

On 2026-11-25 at 09:38 to 09:40 UTC, the production deploy of merge `754524ff` (PR 580, run 45587323339) failed with `api-deployments-free-per-day`. All three Git-integration builds for that commit were refused as rate limited.

The company stays on free plans, so this change removes deployments nobody uses. It does not buy a higher limit, and it does not work around the limit.

## Measured before

Command: `node scripts/measure-vercel-deployments.mjs --days 7 --until 2026-11-26T04:33:00Z`. It reads the GitHub deployments API plus the successful jobs of `deploy-production.yml`.

| Source | axxesstriaxis (beta) | triaxis-www-frontend-import (landing, `staging`) | triaxis-product-investor-demo | lite | Total |
|---|---|---|---|---|---|
| Git preview | 103 | 102 | 105 | – | 310 |
| Git production (`main`) | 24 | 22 | 23 | – | 69 |
| CLI production (`deploy-production.yml`, 28 runs) | – | 21 | 20 | 20 | 61 |
| **Total** | | | | | **440 (62.9 a day)** |

Deployments per day:

| 11-19 | 11-20 | 11-21 | 11-23 | 11-24 | 11-25 | 11-26 (to 04:33) |
|---|---|---|---|---|---|---|
| 71 | 93 | 3 | 45 | 81 | **144** | 3 |

The 310 previews by branch group (branch taken from each commit's PR):

| Branch group | Previews |
|---|---|
| `dependabot/**` | 23 |
| `docs/**` | 45 (13 of the 15 commits on these branches changed only docs, `.md` or `.github` files) |
| everything else | 242 (81, 79 and 82 per project) |

Not measured:
- manual `pnpm run vercel:deploy:*` runs;
- the 6 CLI jobs that failed;
- other repositories' projects on the same Vercel account.

All of these count toward the same cap.

### Which deployments are used

- **`stack-e2e.yml`** tests `staging.triaxisventures.com`. That is the landing project's `staging` branch domain, and `tests/stack/guard.ts` refuses any other host. This is the only preview with a recorded consumer.
- **`playwright.yml` and `ci.yml`** test a local server (`playwright.config.ts` `webServer`). They never use a preview URL.
- **Docs**: no PR preview URL appears in any doc changed from 2026-11-19 to 2026-11-26. The only deployment URLs in docs are production deploys from July and August.
- **Landing and investor production were built twice per merge**: once by Git integration and once by `deploy-production.yml`.

### Why not an ignored build step

Vercel's Ignored Build Step page says canceled builds "are counted as full deployments". An `ignoreCommand` would cut build minutes, but it would not cut the daily count. Only `git.deploymentEnabled`, which creates no deployment at all, or a project with Git disconnected, reduce the count.

## What changed

**`vercel.json`**
- Added `git.deploymentEnabled`: `dependabot/**` and `docs/**` are false.
- Every other branch, including `main` and `staging`, still deploys.

**`.github/workflows/deploy-production.yml`**
- Removed `deploy-landing`. Landing production is now built by Git integration alone.
- `deploy-investor-demo` no longer waits for landing. `deploy-lite` still follows investor.
- Added `deploy-app` for `axxesstriaxis`. It is gated on `vars.VERCEL_APP_DEPLOY_VIA_CLI == 'true'`, so it is skipped until the founder switches the app over.
- Workflow renamed to "Deploy Production (investor demo + lite + app)".

**EOD investor sync** (`scripts/investor-sync-lib.mjs`, `scripts/investor-eod-sync.mjs`, `.github/workflows/eod-investor-sync.yml`)
- `REQUIRED_CHECKS` required the removed check "Deploy landing.triaxisventures.com". It now requires Vercel's commit status `Vercel – triaxis-www-frontend-import` instead.
- The wrapper also reads commit statuses, through `statusesAsCheckRuns`.
- The workflow gains `statuses: read`.
- Without this change, every EOD sync would have failed with "missing".

**New tests and tools**
- `scripts/vercel-deploy-budget.test.mjs` is the dry-run proof. It replays the 7-day branch list through `path.posix.matchesGlob` (minimatch rules, which is what Vercel uses), and checks the job set of the workflow.
- `scripts/measure-vercel-deployments.mjs` is the read-only measurement used above.

**Docs**
- `docs/VERCEL_DEPLOYMENT.md`: new "Who deploys what" section.
- `docs/readiness/TEST_GOVERNANCE.md` and `docs/readiness/GOVERNANCE_RULES.md`: the usual Vercel skips.
- Decision Ledger row and matrix row `VERCEL-DEPLOY-BUDGET`.

## What did not change

- No Vercel project setting.
- No GitHub variable or secret.
- No merge and no deploy.
- Landing previews still build for every other branch.
- Previews are not removed for the app or investor until the founder steps below are done.

## Founder steps

Each is reversible. Do them after the merge.

1. In the Vercel dashboard, open `triaxis-product-investor-demo`, go to Settings > Git, and disconnect the repository. Investor production keeps deploying through `deploy-investor-demo` and the EOD sync. Rollback: reconnect it.
2. In the same sitting, open `axxesstriaxis`, go to Settings > Git, disconnect the repository, and set the GitHub repository variable `VERCEL_APP_DEPLOY_VIA_CLI=true` (Settings > Secrets and variables > Actions > Variables). Beta production then deploys through `deploy-app`. Rollback: delete the variable and reconnect Git.

## Expected after (same 7 days, arithmetic)

| Scenario | Arithmetic | Total |
|---|---|---|
| Repository part only | 440 − 23 Dependabot − 45 docs − 21 landing CLI | **351 (−20%)** |
| + step 1 | 351 − 82 investor previews − 23 investor Git production | **246 (−44%)** |
| + step 2 | 79 landing previews + 22 landing Git production + about 60 CLI (app, investor and lite at about 20 each) | **≈ 161 (−63%, about 23 a day)** |

- The busiest day, 2026-11-25, recomputed: 144 becomes about 26 previews + 7 landing Git + 21 CLI ≈ 54.
- Per merge to `main`: 6 deploys become 4.
- Per feature push: 3 become 1.
- Per docs or Dependabot push: 3 become 0.

## How skips appear to checks

| Case | What GitHub shows |
|---|---|
| `docs/**` and `dependabot/**` PRs | No Vercel status at all (no deployment exists), so nothing is pending or failed |
| After steps 1 and 2 | One Vercel status per PR (landing) |
| `deploy-app`, while the variable is unset | Skipped |

`main` has no required status checks. Merge When Ready's "every check passed" treats these as the usual skips (`TEST_GOVERNANCE.md`). A Vercel status that is present and failed or pending still blocks.

## Risks and rollback

| Change | Risk | Rollback |
|---|---|---|
| `deploymentEnabled` | A `docs/*` branch that changes code gets no preview (2 of 15 commits last week). CI still builds and tests it. | Delete the `git` key |
| Landing CLI job removed | Landing production now depends only on Git integration. A failure shows as a red `Vercel – triaxis-www-frontend-import` status on the `main` commit, not as a red workflow. | Revert the job. Git keeps deploying meanwhile |
| EOD gate on the Vercel status | If Vercel renames the status context, the EOD sync fails closed ("missing"). It never deploys on a missing proof. | Update `LANDING_VERCEL_STATUS` |
| Step 2 (app via CLI) | Beta production is built in Actions with `vercel pull --environment=production`, and the crons come from `vercel.json` as before | Unset the variable and reconnect Git |

## Closeout Evidence

Issue ID: VERCEL-DEPLOY-BUDGET
Title: Get Vercel deployments under the free 100-a-day cap
Origin plan: founder-approved plan, this session (2026-11-26)
Research artifact: the measurement above
Implementation commit(s): see PR
PR: see PR for branch `ci/vercel-deploy-budget`
Branch: `ci/vercel-deploy-budget`
Files changed: `vercel.json`, `.github/workflows/deploy-production.yml`, `.github/workflows/eod-investor-sync.yml`, `scripts/investor-sync-lib.mjs`, `scripts/investor-eod-sync.mjs`, `scripts/investor-sync-lib.test.mjs`, `scripts/vercel-deploy-budget.test.mjs`, `scripts/measure-vercel-deployments.mjs`, `docs/VERCEL_DEPLOYMENT.md`, `docs/readiness/TEST_GOVERNANCE.md`, `docs/readiness/GOVERNANCE_RULES.md`, `docs/readiness/DECISION_OUTCOME_LEDGER.md`, `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`, this file

Verification result:
- `pnpm exec vitest run scripts/vercel-deploy-budget.test.mjs`: PASS, 32/32
- `pnpm exec vitest run scripts/investor-sync-lib.test.mjs`: PASS, 13/13. Before the lib change, the 2 new tests failed and 11 passed.
- Live dry run of the new EOD gate on real `main` commits:
  - `b677d0f6` gives `{"ok":true}`;
  - `21ab9c0f`, whose landing Git build was refused by the limit, gives `{"ok":false,"problems":["Vercel – triaxis-www-frontend-import: failure"]}`.
- `node scripts/measure-vercel-deployments.mjs --days 7 --until 2026-11-26T04:33:00Z`: reproduces the before table (440).
- Standard suite, run locally on this branch:
  - `pnpm run typecheck`: exit 0.
  - `pnpm run lint` (`--max-warnings=0`): exit 0.
  - `pnpm run build`: exit 0.
  - `pnpm run test`, full run: 322 of 324 files passed and 1 was skipped. 2077 of 2079 tests passed and 1 was skipped. 1 test failed: `ChatbotConfirmCard.test.tsx` timed out after 440 s. There were also 92 "Failed to start threads worker ... Timeout waiting for worker to respond" errors.
  - Cause: the Vitest worker-start flake under load, already recorded in `docs/readiness/FAILED_OR_TIMED_OUT_CHECKS.md`. This branch changes no file under `src/`.
  - Rerun of the 92 affected files: 86 of 86 files and 595 of 595 tests passed. The remaining 6 files hit the same worker timeout.
  - Those 6 files, rerun with `--maxWorkers=1`: 6 of 6 files and 77 of 77 tests passed.
  - `ChatbotConfirmCard.test.tsx`, run alone: 2 of 2 tests passed (328 ms).
  - `pnpm --dir apps/mobile run typecheck` and `pnpm run supabase:verify` were not run: no mobile or database file changed.

Deploy evidence: PR 590 was merged by the founder's instruction ("merge 590") as merge commit `af1f4a78`, at checked head `4d89ca82`, which contained `main` `21ab9c0f`. Before the merge, this repository had 44 deployments in the last 24 hours.

- `deploy-production.yml` run 45801622231 succeeded:
  - Deploy investor.triaxisventures.com: success;
  - Deploy lite.triaxisventures.com: success;
  - Deploy beta app (axxesstriaxis): skipped, as intended while the variable is unset.
- Vercel commit statuses on `af1f4a78`: success for axxesstriaxis, triaxis-product-investor-demo, triaxis-www-frontend-import and the team status.
- No `Deploy landing` job ran. Landing was built once, by Git integration.

Live check (2026-11-26T10:34:39Z, `curl` plus `vercel inspect <domain>`):

| Domain | HTTP | Deployment served | Tie to the merge |
|---|---|---|---|
| landing.triaxisventures.com | 200 | `dpl_5oL1ejaxpqtt8Tnoq4gX9aS2RNuV` (`l6mvr0pvm`) | GitHub production deployment 8082694927 for `af1f4a78` has the same URL |
| beta.triaxisventures.com | 200 | `dpl_EuFXD91EpW2MbVFtXAoD6cQBHiGs` (`of4whpmr2`) | GitHub production deployment 8082667706 for `af1f4a78` has the same URL |
| investor.triaxisventures.com | 200 | `dpl_6rZUuD5P2kF1Q5f352T3H91fwcEX` (`r7sfmbjhx`), created 16:00 IST | Built by the `deploy-investor-demo` job of run 45801622231 |
| lite.triaxisventures.com | 200 | `dpl_AdzG7at9FvtvTyBvkZNuEWVZ83nS`, created 16:03 IST | Built by the `deploy-lite` job of run 45801622231 |
| staging.triaxisventures.com | 200 | `dpl_6wR5W285nqeqW5xeE3LGgsALcRJe` (2026-11-24) | Unchanged |

Investor Git integration still built `af1f4a78` (`659lg7vo6`), because founder step 1 is not done. That merge used 5 deployments: 3 Git production, plus 2 CLI.

Acceptance criteria (stated before the work):
- measured before numbers;
- an expected after number with its arithmetic;
- the risk and rollback of each change;
- a PR with the repository part, tests or a dry-run proof, and this closeout;
- no merge, no deploy, no Vercel setting change.

Regression test: the two new tests in `scripts/investor-sync-lib.test.mjs` failed before the lib change and pass after it.

Errors hit this session:
- `gh api --paginate --slurp` combined with `--jq` is rejected by `gh`. Fixed by flattening in node, then re-run (results above).
- `vercel api` read of project settings returned nothing. Replaced by `vercel project inspect`, which showed Root Directory `.` for all three projects.

Decision outcomes:
- Decision: the change set above.
- Outcome: Pending, review by 2026-12-03 (re-run the measurement for the 7 days after the merge and the founder steps).

Final status: Merged and live checked (repository part). Founder steps 1 and 2 not done.
Remaining risk:
- How a `docs/*` PR looks with no Vercel status is not yet observed. It is first visible on the next `docs/*` PR after merge.
- The founder steps are not done.
- Deployments from other repositories on the account are unmeasured.

Follow-up issue IDs: VERCEL-DEPLOY-BUDGET (matrix)
