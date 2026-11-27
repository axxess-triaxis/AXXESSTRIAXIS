# Docs PR Vercel Status: Live Check (2026-11-27)

This docs-only PR shows how the Merge When Ready exception for `docs/**` PRs behaves on a real PR. The exception is added by PR #599 and recorded in `docs/readiness/DOCS_PR_VERCEL_STATUS_CLOSEOUT_2026_11_26.md`.

- Branch: `docs/vercel-status-exception-check`. It matches `docs/**`, so `vercel.json` creates no deployment for it.
- Changed files: this file only.

## Observed on this PR's head

The values below are filled in from the GitHub API after the PR was opened.

- Commit statuses: STATUSES
- `node scripts/docs-pr-vercel-skip.mjs <this PR>`: CHECKER
