# Production Deploy Exception Policy

Governed by: `CLAUDE.md` (Production Gate Bypass -- Standing Rule). Created 2026-08-17 as the fixed
template version of that existing rule, per Paxel's identification of this as the report's strongest
real concern.

`CLAUDE.md` already requires five elements *before* any bypass (`--skip-checks`, `--no-verify`, an admin
merge override, or any mechanism letting a change through a failed/unavailable check). This document is
that template, fillable per incident.

## Template

```markdown
## Production Deploy Exception

Command:
Reason for exception:
Dirty tree status:
Files changed:
Checks skipped:
Checks already run:
Failed/timed-out checks:
Risk accepted:
Rollback plan:
Live verification plan:
Approver:
Closeout link:
```

## Worked example (PR #266, 2026-08-17)

```markdown
## Production Deploy Exception

Command: gh api repos/axxess-triaxis/AXXESSTRIAXIS/pulls/266/merge -X PUT -f merge_method=squash
Reason for exception: One-line temporary diagnostic log needed urgently to resolve a live production
  bug (invitation emails failing) that had already survived two prior fix attempts (PR #264 API-key
  rotation, PR #265 forced rebuild).
Dirty tree status: Clean; only src/services/email/invitationEmail.ts changed versus main.
Files changed: src/services/email/invitationEmail.ts (one console.error line + one code comment).
Checks skipped: none formally skipped -- all required checks ran; 4 reported "failure" and were
  individually root-caused as non-blocking before merge (see below), which is the documented alternative
  this policy prefers over a literal --skip-checks flag.
Checks already run: Build/Lint/Type Check, Capacitor validate, CodeQL, Sprint 27/29 Pilot Acceptance
  Gate, Secret Scan, dependency-review, pnpm Critical Vulnerability Gate, rls-artifact-check,
  mobile-validate, playwright -- 4 of 10 reported failure, root-caused individually (see
  docs/readiness/CI_DEPLOYMENT_LEDGER.md, 2026-08-17 rows).
Failed/timed-out checks:
  - Build/Lint/Type Check + Capacitor validate: pre-existing "Worker exited unexpectedly" Vitest
    worker-crash flake, occurring after all listed unit tests already passed.
  - CodeQL: GitHub API 503 during SARIF upload (confirmed via job log, not a code finding).
  - Sprint 27/29 Pilot Acceptance Gate: identical pre-existing sprint27-golden-path.spec.ts Playwright
    timeout already used as precedent on PRs #264 and #265, on a file this diff never touches.
Risk accepted: None beyond what's already accepted on main -- the diff adds only a console.error log
  line and a comment; no control-flow change.
Rollback plan: If the deployed diagnostic log line causes any new production error, revert commit
  916cc6b immediately.
Live verification plan: Confirm invitationEmail.test.ts still passes on the merged main build; check
  `vercel logs` for the new diagnostic line once the founder retries an invite -- this was the explicit
  purpose of the change.
Approver: Founder (standing authorization for shipping approved/verified work; explicit go-ahead for
  this specific diagnostic given earlier in the session).
Closeout link: docs/readiness/EVIDENCE_INDEX.md row INVITE-EMAIL-DIAG (closeout pending root-cause
  identification via the diagnostic itself).
```

## When this template is required

Any time a merge or deploy proceeds while a CI check shows anything other than a clean "success" --
whether via a literal `--skip-checks`/`--no-verify` flag, or via judgment-call reasoning that a failing
check is non-blocking (as in the worked example above). The judgment-call path is not exempt from this
template just because no flag was technically passed -- the risk being accepted is the same.
