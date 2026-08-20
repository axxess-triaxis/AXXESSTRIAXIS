# Repository Policy

Governed by: `CLAUDE.md` (Operating Model, Git and Deployment Discipline). Created 2026-08-17, formalizing
existing practice already recorded in memory (`project_github_source_of_truth.md`) into a repo-committed
document per Paxel's recommendation.

## GitHub

- **Source of truth.** `axxess-triaxis/AXXESSTRIAXIS` on GitHub is the canonical repository. All four
  live surfaces (web, investor-demo, iOS, Android) sync to this repo's `main` HEAD -- mobile is currently
  exempt from that sync cadence while DUNS-number-blocked (see memory `project_duns_mobile_release_blocker.md`).
- **Public audit record.** This repository is public. See `docs/readiness/PII_MASKING` conventions
  already in effect (memory `feedback_pii_masking_standing_rule.md`) -- no personal emails, phone
  numbers, or private correspondence in tracked docs.

## GitLab (or any other remote)

- **Mirror/fallback only**, not a second source of truth. Any push to a remote other than GitHub's
  `origin` requires explicit authorization in the current conversation and a row in
  `docs/readiness/REMOTE_EXPORT_APPROVALS.md`, especially for strategy-sensitive payloads (roadmap or
  version-boundary material).

## Deployments

- Use the provider's own CLI/API (`vercel`, `gh`) to verify deployment state -- **git remotes are not
  deployment truth.** A merged commit does not by itself confirm a live deployment; confirm via
  `vercel inspect` / `vercel ls` and a live endpoint check, per
  `docs/readiness/DECISION_OUTCOME_LEDGER.md` row `DEPLOY-VERIFY-POLICY`.

## Protected `main`

- Direct pushes to `main` are rejected by branch protection (`GH013: Repository rule violations`).
- **PR-first is the default and, in practice, the only working path** -- even a trivial empty commit to
  force a fresh build must go through a feature branch and PR (see PR #265 for a worked example of this
  exact case).
- No direct protected-`main` push has occurred in this session; any future exception would require the
  same five-part justification as `docs/readiness/PRODUCTION_DEPLOY_EXCEPTION_POLICY.md`, plus an
  explicit statement of why the PR path was not used.

## Worktrees

This repo runs multiple git worktrees (`.cache/worktrees/main-lockfile`, plus ad hoc
`.claude/worktrees/*` created by isolated agent sessions, gitignored via `.git/info/exclude`). Before any
destructive operation (`reset --hard`, `checkout .`, `clean -f`) in any worktree, run `git status` first
and stash (`git stash push -u`) anything present, per `CLAUDE.md`'s standing git-safety rule -- this
matters especially for `docs/MIXPANEL.md` and
`docs/readiness/MIXPANEL_INVESTOR_DEMO_LIVE_EVENT_PROOF_2026_08_15.md`, which are pre-existing,
not-mine, uncommitted/untracked files that must survive every rebase or reset untouched.
