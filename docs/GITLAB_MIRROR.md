# GitLab Mirror And Continuity Remote

## Purpose

AXXESS keeps GitHub as the primary source-of-truth repository and auditable public record where reachable, while GitLab is maintained as a mirror and fallback continuity repository.

The current GitLab repository is:

```text
https://gitlab.com/triaxis-ventures-private-limited-group/axxess-triaxis
```

This arrangement exists because GitHub availability was disrupted during development. The platform should not depend on a single Git host for deployment, migration, mobile release or issue-tracking operations.

GitLab is not intended to replace GitHub as the primary public source-of-truth record. Its role is continuity, mirroring and fallback use if GitHub becomes unavailable or operationally blocked.

As of 2026-07-22, the GitHub suspension affecting the AXXESS account/repository is under appeal with GitHub Support under ticket ID `4589741`. GitHub Support requested follow-up from an email address verified on the affected account. The support email was forwarded to the verified GitHub account email address, and the appeal follow-up was sent from that verified email.

The working hypothesis documented in the appeal is that high-volume legitimate AI-assisted development activity may have resembled abusive automation to an automated system. No intentional spam, phishing, malware distribution, unauthorized access, deceptive automation or Terms of Service violation has been acknowledged. GitLab is therefore used as continuity infrastructure while GitHub support review remains pending.

See `docs/GITHUB_INDEPENDENT_OPERATIONS.md` for the CLI/API operating model and `docs/CANONICAL_WORKSPACE_MIGRATION.md` for the verified migration record.

## Current Remotes

As of the canonical workspace migration, the expected remotes are:

```text
gitlab  https://gitlab.com/triaxis-ventures-private-limited-group/axxess-triaxis.git
origin  https://github.com/axxess-triaxis/AXXESSTRIAXIS.git
```

`origin` points to GitHub, the intended primary source-control and audit record when reachable.

`gitlab` is the verified writable GitLab remote used for mirror and fallback continuity pushes.

Do not assume a deployment, migration or operational action has succeeded merely because a Git host exists. Vercel, Supabase, Linear and mobile release operations must be verified through their own CLIs, APIs or dashboards.

GitHub and GitLab are detached from being deployment mediators. They are version-control systems, source-history systems and audit records. Deployments are executed by the relevant provider tooling.

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
- It should keep GitLab usable as a fallback without changing the policy that GitHub is the primary source-of-truth repository when available.

## Documentation Requirement

Every mirror, migration or remote reconciliation event must update documentation when it changes the operational truth of the repository.

At minimum, update:

- `docs/CANONICAL_WORKSPACE_MIGRATION.md`
- `docs/GITHUB_INDEPENDENT_OPERATIONS.md`
- `docs/ENGINEERING_WORKFLOW.md`
- `CHANGELOG.md`

This is required so technical reviewers, investors, enterprise buyers, due diligence reviewers and government or sovereign stakeholders can audit repository provenance without relying on chat history.
