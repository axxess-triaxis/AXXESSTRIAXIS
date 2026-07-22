# AXXESS Engineering Workflow

AXXESS uses a GitHub/GitLab remote pair, CLI-driven deployment operations, Linear for work tracking, and repository-local verification gates.

The current canonical local workspace is:

```text
C:\Users\Sudipta Sarmah\OneDrive - State Bank of India\Documents\AXXESS-TRIAXIS
```

The verified GitLab repository is:

```text
https://gitlab.com/triaxis-ventures-private-limited-group/axxess-triaxis
```

GitHub remains useful for historical continuity when reachable, but deployment and tracking should not depend on GitHub availability. Vercel, Supabase, Linear and mobile release operations are run through their own CLIs or APIs.

See:

- `docs/CANONICAL_WORKSPACE_MIGRATION.md`
- `docs/GITHUB_INDEPENDENT_OPERATIONS.md`
- `docs/GITLAB_MIRROR.md`
- `docs/DOCUMENTATION_GOVERNANCE.md`

## Branches

Use short-lived feature branches from `main`:

```text
feature/AXX-001-supabase-repositories
fix/AXX-002-session-refresh
docs/AXX-003-rbac-policy-notes
```

Do not force-push shared branches unless the team explicitly agrees.

Before pushing to GitLab `main`, verify the push is a fast-forward unless a human has explicitly approved a different reconciliation strategy.

## Commits

Use Conventional Commits and include the Linear issue when one exists:

```text
feat(AXX-001): add Supabase project repository
fix(AXX-002): refresh expired server sessions
test(AXX-003): cover tenant RLS policy matrix
```

Do not invent Linear issue IDs. If no issue exists yet, use a normal semantic commit without an `AXX-*` reference.

## Pull Requests And Merge Requests

Every pull request or merge request should include:

- Linked Linear issue, when available.
- Migration impact.
- Tenant/RBAC impact.
- Verification results.
- Screenshots only when the UI changes.
- Documentation impact.
- Provider-gated or credential-gated items.
- Remaining risks.

## Documentation Requirement

Documentation is a required output of future work. Every sprint, material feature, security change, AI workflow change, database change, deployment change or integration change must update the relevant documentation.

At minimum, consider whether the change affects:

- `README.md`
- `CHANGELOG.md`
- `docs/SPRINT_LOG.md`
- A sprint-specific document
- Domain docs such as `docs/AUTH.md`, `docs/RAG.md`, `docs/MOBILE_RELEASE.md`, `docs/SUPABASE_CLI.md`, `docs/VERCEL_DEPLOYMENT.md`, `docs/PLUGIN_RUNTIME.md` or `docs/GITHUB_INDEPENDENT_OPERATIONS.md`

Documentation must be useful to:

- Technical reviewers
- Investors assessing technical and engineering capability
- Enterprise buyers
- Investor and technical due diligence teams
- Government, sovereign and regulated stakeholders

Use `docs/DOCUMENTATION_GOVERNANCE.md` as the standing standard.

## Linear

When Linear integration is enabled, branches, commits, pull requests or merge requests that reference `AXX-*` issues should link automatically. Merge automation can move an issue to Done only when the real Linear workflow supports it.

## Vercel

Vercel deployment should be controlled through the Vercel CLI/API and repository runbooks. Do not make the platform dependent on a Git host being available.

## Quality Gates

Before merge:

```text
pnpm run typecheck
pnpm --dir apps/mobile run typecheck
pnpm run lint
pnpm run test
pnpm run build
pnpm run supabase:verify
pnpm run mobile:store:release-gate
pnpm run mobile:capacitor:store:doctor
```

When a change touches a specific subsystem, run the additional gate for that subsystem and document the result.
