# Docs PR Vercel Status Closeout (2026-11-26)

## Why

PR #590 (`VERCEL_DEPLOY_BUDGET_CLOSEOUT_2026_11_26.md`) set `git.deploymentEnabled` to false for `docs/**` in `vercel.json`. Its closeout expected docs PRs to show "no Vercel status at all". They do not.

Every docs PR since then shows one status that never resolves:

| PR | Head | Status | State | Description |
|---|---|---|---|---|
| #592 | `9e0c34b5` | `Vercel Deployments – AXXESS TRIaxis powered by Triaxis Ventures` | pending | Required and affected projects deploying |
| #597 | `7f1ff204` | same | pending | same |
| #582 | `47462786` | same | pending | same |

There is no per-project `Vercel – <project>` status on these heads.

On code PRs (#590 `4d89ca82`, #584 `033cc0ad`) and on `main` (`14def3b4`), the same status goes from pending to success ("All required and affected projects deployed") once the three project statuses succeed. Source: `gh api repos/axxess-triaxis/AXXESSTRIAXIS/commits/<sha>/statuses`, read 2026-11-26.

Merge When Ready condition 2 (`CLAUDE.md`) allows no pending check. So every docs PR needed a founder yes. #597 got one on 2026-11-26. #592 and #582 were merged with the status pending.

## Research (public Vercel docs, read 2026-11-26)

- The status is Vercel's opt-in **consolidated commit status** for repositories with several projects. See the [changelog](https://vercel.com/changelog/consolidated-commit-status-now-available-for-github) and [Vercel for GitHub, Commit status](https://vercel.com/docs/git/vercel-for-github).
- It is configured per project in **Settings > Git** in the dashboard. The same settings mark which projects are required for merge and which are soft failures.
- The [`git.deploymentEnabled` docs](https://vercel.com/docs/project-configuration/git-configuration) say nothing about commit statuses.
- No `vercel.json` or other repository setting is documented that makes the consolidated status resolve when no project deploys.
- The docs do not contain the exact status strings. They come from the GitHub API reads above.

## Options considered

| Option | Result |
|---|---|
| (a) Repository config change | Not possible: no documented repo-only control. |
| (a') Dashboard: turn off the consolidated status in the three projects | Works, but it is a founder dashboard setting. Left as an optional founder step. |
| (a'') Build docs previews again | Costs about 45 deployments a week and undoes part of #590. Rejected. |
| (a''') An Action that posts `success` under Vercel's status name | Would fake another system's signal. Rejected. |
| **(b) Narrow written exception in Merge When Ready** | **Chosen.** The founder said yes in the session of 2026-11-26 ("Yes, add exception"). |

## What changed

- **`CLAUDE.md`**, Merge When Ready condition 2, adds one named exception. On a docs-only PR, that exact status left pending with "Required and affected projects deploying" counts as the usual skip. All of the following must hold:
  - the branch matches `docs/**`;
  - every changed file ends in `.md` or is a non-code file under `docs/`;
  - no `Vercel – <project>` status exists on the head;
  - `node scripts/docs-pr-vercel-skip.mjs <pr>` prints `"ok":true`.

  The merging session records that output. Any other state of that status, or of any Vercel status, still blocks.
- **`scripts/docs-pr-vercel-skip.mjs`** is a new, read-only checker. It uses `gh api` GET requests only, and it reads `vercel.json` live for the branch rule.
- **`scripts/docs-pr-vercel-skip.test.mjs`** is new, with 18 tests.
- **Pointers:**
  - `docs/readiness/GOVERNANCE_RULES.md` and `docs/readiness/TEST_GOVERNANCE.md` point to the exception.
  - `docs/VERCEL_DEPLOYMENT.md` gets the corrected description.
  - `VERCEL_DEPLOY_BUDGET_CLOSEOUT_2026_11_26.md` gets a one-line correction in its "How skips appear" table.
- **Records:** a Decision Ledger row and matrix row `DOCS-PR-VERCEL-STATUS`.

## What did not change

- No Vercel dashboard setting.
- No secret.
- No `vercel.json` change.
- No deploy.
- `dependabot/**` PRs get no exception. Their only status is the same pending summary, so they still need every other gate and a founder yes or the dashboard step.
- No other check is relaxed. The rest of Merge When Ready is unchanged.

## Verification

- Regression test first: `scripts/docs-pr-vercel-skip.test.mjs` was written before the checker.
  - The first run happened while dependency install was still running. By the time it executed, the checker existed, so a "module missing" failure was not captured.
  - That first run did fail 1 of 18 tests: "refuses a docs branch that changes docs/site/app.ts". The first draft allowed any file under `docs/`. The checker was tightened to refuse code extensions there.
- `pnpm exec vitest run scripts/docs-pr-vercel-skip.test.mjs scripts/vercel-deploy-budget.test.mjs`: 2 files and 50 of 50 tests passed.
- Live dry run on real PRs (read-only):
  - `node scripts/docs-pr-vercel-skip.mjs 597`: `{"ok":true,"problems":[]}`, exit 0 (head `7f1ff204`).
  - `592`: ok, exit 0.
  - `582`: ok, exit 0.
  - `590` (code PR): summary success, ok, exit 0.
- Standard suite, run locally on this branch:
  - `pnpm run typecheck`: exit 0.
  - `pnpm run lint` (`--max-warnings=0`): exit 0.
  - `pnpm run build`: exit 0.
  - `pnpm run test`, full local run: did not finish. Node segfaulted (exit 139) after a Vitest worker for `src/app/api/rag/query/route.test.ts` was "torn down or never initialized", and `DashboardSection.test.tsx` ED3-04 timed out at 18 s. This is the known local worker pattern (`FAILED_OR_TIMED_OUT_CHECKS.md`, "Known recurring pattern: Vitest Worker exited unexpectedly"; also seen in the #590 closeout). This PR changes no `src/` file. ISOLATED_RERUN
  - CI full suite on the PR head: CI_RESULT
- Shown on a new docs PR: TEST_DOCS_PR

## Remains partial or unsupported

- Vercel could rename the status or change its description. The checker then fails closed (exit 1), and the founder is asked again.
- The optional founder step is to turn off the consolidated status in Vercel Settings > Git for `axxesstriaxis`, `triaxis-www-frontend-import` and `triaxis-product-investor-demo`. The exception then goes unused. Founder-owned, not done.
- The 50 to 70% approval reduction is not measured here. The Decision Ledger outcome is pending and will be reviewed by 2026-12-10.

## Approvals asked this session

One: whether to add the rule exception. It is a governance change and could not have been avoided.

## Closeout Evidence

- Issue ID: DOCS-PR-VERCEL-STATUS
- Branch: `chore/docs-pr-vercel-status-skip`. It is not a `docs/**` branch because it adds a script.
- PR: see PR
- Files changed: `CLAUDE.md`, `scripts/docs-pr-vercel-skip.mjs`, `scripts/docs-pr-vercel-skip.test.mjs`, `docs/VERCEL_DEPLOYMENT.md`, `docs/readiness/GOVERNANCE_RULES.md`, `docs/readiness/TEST_GOVERNANCE.md`, `docs/readiness/VERCEL_DEPLOY_BUDGET_CLOSEOUT_2026_11_26.md`, `docs/readiness/DECISION_OUTCOME_LEDGER.md`, `docs/readiness/ACTIONABLES_READINESS_MATRIX.md`, this file
