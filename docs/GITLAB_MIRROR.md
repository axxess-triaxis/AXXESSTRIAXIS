# GitLab Mirror

## Why this exists

This repo's original `origin` remote pointed at GitHub (`axxess-triaxis/AXXESSTRIAXIS`). That
account got suspended mid-project -- `git fetch`/`git push` started returning "Your account is
suspended" -- which broke every workflow that assumed GitHub was reachable. In response:

- The original GitHub remote was renamed from `origin` to `github` (still useful for read access
  and history, when reachable; not relied on for anything going forward).
- A GitLab repository was added as the new `origin`, and is now the writable remote this project
  depends on.

## Current remotes

```bash
git remote -v
```

Expect:

```
github  https://github.com/axxess-triaxis/AXXESSTRIAXIS.git (fetch/push)
origin  https://gitlab.com/triaxis-ventures-private-limited-group/axxess-triaxis.git (fetch/push)
```

## Known gap (check before assuming GitLab is current)

`git push -u origin --all` was run once during the initial migration, but the **local** `main`
branch had never been fast-forwarded to match the true GitHub history at that point -- fetching
only updates a remote-tracking ref (`github/main`), not the local `main` branch itself. As a
result, GitLab's `main` shipped 53 commits behind, missing everything from PR #150 onward. Before
trusting GitLab's `main` as current, check:

```bash
git fetch github
git log main..github/main --oneline   # anything listed here is missing from local main
```

If local `main` is behind, fast-forward it and push, but **coordinate with anyone else pushing to
GitLab first** (a second agent, Codex, has been committing Sprint work directly to this GitLab
remote) -- a fast-forward is safe only if GitLab's `main` hasn't independently moved ahead with
commits `github/main` doesn't have:

```bash
git fetch origin
git log origin/main..github/main --oneline   # what github has that gitlab doesn't
git log github/main..origin/main --oneline   # what gitlab has that github doesn't -- if this is
                                              # non-empty, do NOT fast-forward blindly; reconcile
                                              # the two histories first (merge or rebase, decided
                                              # by a human, not this doc)
git checkout main
git merge github/main --ff-only
git push origin main
```

## Ongoing mirroring

Use `scripts/gitlab-mirror-push.mjs` (via `pnpm run gitlab:mirror`) rather than raw `git push
--all` going forward. It is deliberately conservative:

```bash
pnpm run gitlab:mirror:dry-run   # read-only: fetches both remotes, reports what would happen
pnpm run gitlab:mirror           # pushes, but only branches that fast-forward cleanly
```

For each local branch, it:

1. Prefers the `github` remote's view of that branch (the canonical upstream) over the local
   branch pointer, if `github` has it.
2. Pushes to `origin` (GitLab) only if that push would be a fast-forward there -- i.e. GitLab's
   copy of the branch doesn't exist yet, or is strictly behind.
3. **Skips and reports** any branch where GitLab's copy has diverged (has commits the source
   doesn't), rather than force-pushing over it. A diverged branch means someone (very possibly
   Codex) pushed something to GitLab directly -- overwriting that silently would destroy their
   work. Reconciling a genuine divergence needs a human decision, not a default script behavior.
4. Pushes all tags at the end.

The script exits with a non-zero code if anything was skipped for divergence, so it's safe to wire
into automation later without silently ignoring conflicts.

## What this does not do

- It does not force-push, ever. There is no flag to make it force-push.
- It does not touch GitHub (`github` remote) at all -- it only reads from it as a fetch source.
- It does not resolve merge conflicts or diverged history automatically -- it surfaces them.
