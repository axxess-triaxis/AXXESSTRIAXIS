# AXXESS Engineering Workflow

AXXESS uses GitHub as the source of truth, Linear for work tracking, and Vercel for deployment.

## Branches

Use short-lived feature branches from `main`:

```text
feature/AXX-001-supabase-repositories
fix/AXX-002-session-refresh
docs/AXX-003-rbac-policy-notes
```

Do not force-push shared branches unless the team explicitly agrees.

## Commits

Use Conventional Commits and include the Linear issue when one exists:

```text
feat(AXX-001): add Supabase project repository
fix(AXX-002): refresh expired server sessions
test(AXX-003): cover tenant RLS policy matrix
```

Do not invent Linear issue IDs. If no issue exists yet, use a normal semantic commit without an `AXX-*` reference.

## Pull Requests

Every pull request should include:

- Linked Linear issue, when available.
- Migration impact.
- Tenant/RBAC impact.
- Verification results.
- Screenshots only when the UI changes.

## Linear

When Linear GitHub integration is enabled, branches, commits, and pull requests that reference `AXX-*` issues should link automatically. Merge automation can move an issue to Done only when the real Linear workflow supports it.

## Vercel

Pull requests should produce preview deployments through Vercel. Merges to `main` should build from GitHub and deploy production when the project policy allows production deploys from `main`.

## Quality Gates

Before merge:

```text
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```
