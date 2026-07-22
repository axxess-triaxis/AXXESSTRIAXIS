# GitLab Mirror And Continuity Remote

## Purpose

AXXESS keeps GitHub for historical continuity where reachable and GitLab as the verified writable continuity remote.

The current GitLab repository is:

```text
https://gitlab.com/triaxis-ventures-private-limited-group/axxess-triaxis
```

This arrangement exists because GitHub availability was disrupted during development. The platform should not depend on a single Git host for deployment, migration, mobile release or issue-tracking operations.

See `docs/GITHUB_INDEPENDENT_OPERATIONS.md` for the CLI/API operating model and `docs/CANONICAL_WORKSPACE_MIGRATION.md` for the verified migration record.

## Current Remotes

As of the canonical workspace migration, the expected remotes are:

```text
gitlab  https://gitlab.com/triaxis-ventures-private-limited-group/axxess-triaxis.git
origin  https://github.com/axxess-triaxis/AXXESSTRIAXIS.git
```

`gitlab` is the verified writable GitLab remote used for continuity pushes.

`origin` currently points to the historical GitHub repository.

Do not assume a deployment, migration or operational action has succeeded merely because a Git host exists. Vercel, Supabase, Linear and mobile release operations must be verified through their own CLIs, APIs or dashboards.

## Verified Migration State

The canonical local workspace is:

```text
C:\Users\Sudipta Sarmah\OneDrive - State Bank of India\Documents\AXXESS-TRIAXIS
```

The final verified migration commit is:

```text
615faf218fbfe538dcdcd1eb1a079ee05ad65b4b
```

After migration, these GitLab branches pointed to that same commit:

```text
main
canonical/sprint-1-35-unified-gitlab
fix/live-tenant-onboarding-and-rag-walkthrough
```

This means the GitLab repository contains the unified Codex Sprint 1-32 history plus later Claude work at the verified migration point.

## Safe Push Policy

Never force-push shared branches unless a human explicitly approves the reconciliation and the reason is documented.

Before updating GitLab `main`, use fast-forward checks:

```bash
git fetch gitlab
git merge-base --is-ancestor gitlab/main HEAD
```

Only push to `main` when the check confirms GitLab `main` is an ancestor of the local `HEAD`, or when a documented human-approved merge/reconciliation has already been completed.

## Ongoing Mirroring

Use repository scripts where possible:

```bash
pnpm run gitlab:mirror:dry-run
pnpm run gitlab:mirror
```

The mirror workflow is intentionally conservative:

- It should not force-push.
- It should report divergence rather than overwrite it.
- It should preserve branches created by Codex, Claude Code or a human engineer.
- It should keep tags aligned only when safe.

## Documentation Requirement

Every mirror, migration or remote reconciliation event must update documentation when it changes the operational truth of the repository.

At minimum, update:

- `docs/CANONICAL_WORKSPACE_MIGRATION.md`
- `docs/GITHUB_INDEPENDENT_OPERATIONS.md`
- `docs/ENGINEERING_WORKFLOW.md`
- `CHANGELOG.md`

This is required so technical reviewers, investors, enterprise buyers, due diligence reviewers and government or sovereign stakeholders can audit repository provenance without relying on chat history.
