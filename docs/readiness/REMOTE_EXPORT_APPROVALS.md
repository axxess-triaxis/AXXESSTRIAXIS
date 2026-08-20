# Remote Export Approvals

Governed by: `CLAUDE.md` (Git and Deployment Discipline), `docs/REPOSITORY_POLICY.md`. Created
2026-08-17. Every push to a remote outside the primary GitHub repo (a GitLab mirror, a fork, any
strategy-sensitive payload) should get a row here, especially where the payload includes roadmap or
scope material (e.g. Lite/X0 boundary documents) that carries competitive sensitivity.

## Row template

```markdown
## Export Approval

Date:
Remote:
Branch:
Payload:
Sensitivity:
Reason:
Risk stated by agent:
Human authorization:
Commit hash:
Push result:
```

## Current state, verified 2026-08-17

No remote export outside the canonical `axxess-triaxis/AXXESSTRIAXIS` GitHub repository occurred during
this session. This session's own pushes were all to `origin` (GitHub) on feature branches
(`fix/invitation-email-diagnostic-log`, and earlier `docs/actionables-matrix-a102-a103-stale-fix`), each
followed by a normal PR and merge -- not a cross-remote export. No rows are seeded here because none of
this session's work triggered this policy; this file establishes the format for when a GitLab
mirror/fallback push or similar cross-remote action next actually occurs, per
`docs/REPOSITORY_POLICY.md`'s statement that GitHub is source of truth and any other remote requires
explicit authorization before a push.
