# CI and Deployment Ledger

Governed by: `CLAUDE.md` (Git and Deployment Discipline, Production Gate Bypass). Created 2026-08-20.
Cumulative record of CI runs and deployments where the outcome mattered enough to need a citable trail --
not every green run, but every one that involved a bypass, a genuine failure investigation, or a
production-facing deploy.

| Date | Workflow | Run ID | Branch | Commit | Result | Failure string | Action | Live proof |
|---|---|---|---|---|---|---|---|---|
| 2026-08-17 | Repository Quality (Build, Lint, Type Check) | 32051189609 | `fix/invitation-email-diagnostic-log` | 916cc6b | failure | `Error: Worker exited unexpectedly` (Vitest worker crash, after all listed unit tests already passed) | No rerun; confirmed via job log as the known pre-existing infra flake, same signature as prior PRs #264/#265 | N/A (non-blocking per Production Gate Bypass justification on PR #266) |
| 2026-08-17 | Capacitor Mobile Build (`validate`) | 32051189574 | `fix/invitation-email-diagnostic-log` | 916cc6b | failure | `Error: Worker exited unexpectedly` (identical Vitest worker crash) | No rerun; same known flake | N/A |
| 2026-08-17 | Security Gates (CodeQL job) | 32051189595 | `fix/invitation-email-diagnostic-log` | 916cc6b | failure | `##[error]No server is currently available to service your request.` (GitHub API 503 during SARIF upload) | No rerun attempted before merge; confirmed via job log grep that the failure was GitHub's own API outage, not a CodeQL finding | N/A |
| 2026-08-17 | Pilot Golden Path Release Gate (Sprint 27/29 Pilot Acceptance Gate) | 32051189677 | `fix/invitation-email-diagnostic-log` | 916cc6b | failure | `Error: expect(locator).toBeVisible() failed` at `tests/e2e/sprint27-golden-path.spec.ts:24:61` (`page.goto("/ai-workspace/review-inbox")`) | No rerun; identical pre-existing failure signature already used as precedent on PRs #264 and #265, on a spec file this diff never touches | N/A |
| 2026-08-17 | PR #266 merge (`gh api .../pulls/266/merge`, squash) | N/A (REST merge, not a workflow run) | `fix/invitation-email-diagnostic-log` -> `main` | squash SHA `6daa69f` | success (after repeated `HTTP 503` from GitHub's GraphQL API on the first several attempts) | `HTTP 503: No server is currently available to service your request.` on `gh pr merge` (GraphQL) and the first REST attempt | Confirmed via `githubstatus.com` API showing an active partial outage (Git Operations, Issues degraded) before retrying; retried via REST endpoint once reads confirmed the PR was still mergeable; succeeded on the next attempt | `vercel ls` confirmed deployment `triaxis-www-frontend-import-tlnzy9cex` Ready, 9m age; live checks: `curl -o /dev/null -w "%{http_code}"` returned `307` on both `landing.triaxisventures.com` and `investor.triaxisventures.com` (consistent, expected redirect behavior for this app, not an error) |

## How to add a row

Every row should be sourced from an actual command, not recollection:

```
gh run view <run-id> --repo axxess-triaxis/AXXESSTRIAXIS
```

or

```
gh api repos/axxess-triaxis/AXXESSTRIAXIS/actions/jobs/<job-id>/logs
```

Paste the exact failure string found via `grep -iE "##\[error\]|Process completed with exit code"`, not
a paraphrase. If a failure is judged non-blocking, the row's Action column must say why (matching flake
signature, confirmed external outage, etc.) -- "assumed flake" is not an acceptable entry.
