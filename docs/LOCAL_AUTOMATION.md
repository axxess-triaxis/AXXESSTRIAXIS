# Local Post-Sprint Automation

For how this fits alongside GitHub Actions, GitLab CI, and GitLab Duo Code Review -- including a full "what is and isn't automated" breakdown -- see `docs/AUTOMATION_OVERVIEW.md`.

## Purpose

This automation exists to catch regressions and confirm the app still builds/deploys correctly on a regular cadence, **independent of whether GitHub or GitLab are reachable** -- both have had availability incidents during this project (see `docs/GITLAB_MIRROR.md`). It runs entirely on the local development machine using already-authenticated CLIs; it does not fetch, pull, or push any git remote.

## What It Does

`scripts/post-sprint-verify-and-preview-deploy.ps1`:

1. Runs the full local verification suite in order: `pnpm run typecheck`, `pnpm --dir apps/mobile run typecheck`, `pnpm run lint`, `pnpm run test`, `pnpm run build`, `pnpm run supabase:verify`.
2. **Only if every step passes**, runs a Vercel deploy with `vercel deploy --yes` -- this always creates a **preview** deployment; the script never passes `--prod` and never will.
3. Runs `pnpm run supabase:verify` once more as the final reported check. This is a read-only migration/RLS audit script (see `scripts/verify-supabase-migrations.mjs`) -- it never runs `supabase db push` or any other command that would apply a migration to a live database.
4. Logs a timestamped summary to `.cache/post-sprint-automation/<timestamp>.log` (gitignored, since `.cache/` is already in `.gitignore`).

## Explicit Safety Boundaries

- **No production Vercel deploy.** Only `vercel deploy` (preview) is ever invoked.
- **No live Supabase migration push.** Only `supabase:verify` (read-only) is ever invoked.
- **No git operations.** The script does not run `git fetch`, `git pull`, or `git push` -- it only reads the current working-tree state (and logs the current branch/HEAD for reference). It is unaffected by GitHub or GitLab being down.
- If any verification step fails, the script stops immediately and does **not** attempt the preview deploy.

## Schedule

Registered as a Windows Scheduled Task:

```text
Task name: AXXESS-PostSprint-VerifyAndPreviewDeploy
Cadence:   every 2 hours
Principal: current Windows user, Interactive logon type (requires an active session,
           so it can use the same locally cached Vercel/Supabase CLI auth as an
           interactive shell)
```

To inspect or change it:

```powershell
Get-ScheduledTask -TaskName "AXXESS-PostSprint-VerifyAndPreviewDeploy"
Get-ScheduledTaskInfo -TaskName "AXXESS-PostSprint-VerifyAndPreviewDeploy"
```

To run it on demand instead of waiting for the schedule:

```powershell
Start-ScheduledTask -TaskName "AXXESS-PostSprint-VerifyAndPreviewDeploy"
```

To change the cadence, re-register the task with a different `-RepetitionInterval` (see the task's creation command in this repo's session history, or use `Set-ScheduledTask` with a new trigger).

## Vercel CLI Setup

`vercel` is pinned as a `devDependency` (`package.json`, matching the existing `supabase` CLI pinning convention) so `pnpm exec vercel` resolves a consistent, repo-local version rather than relying on a global install. This checkout is linked to the `axxesstriaxis` Vercel project under the `axxess-tri-axis-powered-by-triaxis-ventures` team (`.vercel/project.json`, gitignored -- each local checkout must run `vercel link --project=axxesstriaxis --scope=axxess-tri-axis-powered-by-triaxis-ventures --yes` once to recreate it).

## Reviewing Results

Logs are local-only (not committed, not pushed anywhere). Check `.cache/post-sprint-automation/` for the most recent run's timestamped log file after the scheduled cadence, or after a manual `Start-ScheduledTask` run.

## Related

- `docs/GITLAB_MIRROR.md` -- "Automated Post-Sprint CI Verification And AI Code Review" section covers the separate GitLab-hosted CI pipeline (typecheck/lint/test/build/security on every push and MR) and GitLab's native Duo Code Review, both of which are independent of this local automation.
- `docs/qa-artifacts/`, `docs/BETA_QA_*`, `docs/SPRINT_1_CLOSEOUT_2026_07_22.md` -- the beta QA remediation program this local automation was requested alongside, to make sure future sprints don't regress the auth-integrity fixes without a human needing to remember to run the full suite manually.
