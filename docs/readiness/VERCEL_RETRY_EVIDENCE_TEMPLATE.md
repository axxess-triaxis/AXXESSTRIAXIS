# Vercel Retry Cycle Evidence Template

Governed by: `docs/readiness/PRODUCTION_DEPLOY_EXCEPTION_POLICY.md`,
`docs/readiness/DECISION_OUTCOME_LEDGER.md` row `DEPLOY-RETRY-POLICY`. Created 2026-08-17.

## Template

```markdown
## Vercel Retry Cycle Evidence

Workflow:
Run ID:
Current status:
Concurrency check:
- raw `gh run list` output:

Retry condition:
- Expected retryable strings:
  - `api-upload-free`
  - `Too many requests`
- Actual failed log string:

Decision:
- Rerun:
- Stop:
- Reason:

Post-run verification:
- Workflow conclusion:
- landing domain status:
- investor domain status:

Scheduled task cleanup:
- Deleted:
- Reason:
```

## Worked example (PR #266 merge, 2026-08-17 -- GitHub API outage, not a Vercel quota issue)

```markdown
## Vercel Retry Cycle Evidence

Workflow: PR #266 merge (gh api .../pulls/266/merge)
Run ID: N/A (this was a GitHub REST/GraphQL 503, not a Vercel deployment quota error)
Current status: PR open, unmerged, mergeable=true, mergeable_state=unstable

Retry condition:
- Expected retryable strings: N/A -- this incident was outside the Vercel-quota retry policy scope
- Actual failed log string: "HTTP 503: No server is currently available to service your request."
  (GitHub GraphQL API), later "No server is currently available to service your request." on a REST
  merge attempt too

Decision:
- Rerun: Yes, after confirming via https://www.githubstatus.com/api/v2/summary.json that GitHub's own
  Pull Requests/Git Operations components were degraded (not our infra, not a Vercel quota condition)
- Stop: Paused between attempts rather than looping automatically -- an automated retry loop was
  correctly blocked by the harness's own auto-mode classifier as a risky repeated-mutation pattern
- Reason: Confirmed external outage, not a code or quota failure; safe to retry manually once reads
  (GET on the PR) succeeded again

Post-run verification:
- Workflow conclusion: Merge succeeded on retry, squash SHA 6daa69f
- landing domain status: Fresh triaxis-www-frontend-import deployment observed via `vercel ls`,
  "Queued" at 48s age immediately post-merge; full Ready confirmation pending as of this document's
  authoring
- investor domain status: Not separately re-checked for this specific merge (no investor-domain files
  touched by this diff)

Scheduled task cleanup:
- Deleted: N/A -- no scheduled task was created for this incident
- Reason: N/A
```

## Note on scope

This template is Vercel-specific per the founder's original request, but the worked example above is a
GitHub API outage, not a Vercel deployment-quota retry -- included because it's the most recent real
retry-decision this program has made, and it demonstrates the same discipline (verify the failure class
before retrying, never loop blindly) that the Vercel-quota case calls for. A genuine Vercel quota-retry
incident (`api-upload-free`, `Too many requests`) should get its own worked-example entry here when one
next occurs.
