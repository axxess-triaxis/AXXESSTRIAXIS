# Supabase CLI Integration

AXXESS manages Supabase through a repo-local CLI dependency, pinned in `package.json`. Every
command in this document talks directly to the Supabase CLI/API -- none of it depends on GitHub,
GitHub Actions, or any particular Git host being reachable (see
`docs/GITHUB_INDEPENDENT_OPERATIONS.md`).

## Why This Exists

Sprint 25 initially exposed a gap: migrations existed, but the local environment did not have Supabase CLI installed. That meant a migration could be created manually without the normal Supabase migration workflow.

This is now closed by:

- pinning `supabase@2.109.1` as a root dev dependency,
- committing `supabase/config.toml`,
- committing `supabase/.gitignore`,
- adding Supabase package scripts,
- adding `scripts/verify-supabase-migrations.mjs`,
- adding the `Supabase CLI Integration` GitHub Actions workflow.

## Daily Commands

```bash
pnpm run supabase:version
pnpm run supabase:verify
pnpm run supabase:migration:new -- add_example_table
```

## Local Database Drill

Requires Docker:

```bash
pnpm exec supabase start
pnpm run supabase:db:reset
pnpm run supabase:db:lint
pnpm run supabase:test:rls
pnpm exec supabase stop --no-backup
```

## Linked Project Workflow (GitHub-independent)

Applying migrations to the real remote project only ever needs the Supabase CLI talking directly
to Supabase's API -- no GitHub Actions step, no Git push, and no dependency on any Git host being
reachable. This checkout is not yet linked to a remote project (no `supabase/.temp/project-ref`
exists here); linking needs a real project ref and either an interactive login or
`SUPABASE_ACCESS_TOKEN`, none of which are available in this environment -- do this from a machine
with real Supabase account access.

One-time link:

```bash
pnpm run supabase:link -- --project-ref <project-ref>
```

Then, for every migration apply, use `scripts/supabase-migrate-remote.mjs` rather than the raw
`db push` commands directly -- it always runs a dry run first and only actually applies migrations
when passed `--yes`, so it can never apply anything by accident:

```bash
pnpm run supabase:migrate:remote          # dry run only, prints the diff, applies nothing
pnpm run supabase:migrate:remote:apply    # dry run, then applies if it looks right
```

Equivalent raw commands, if you want them separately:

```bash
pnpm run supabase:db:dry-run   # supabase db push --linked --dry-run
pnpm run supabase:db:push      # supabase db push --linked (applies)
```

Use `pnpm run supabase:db:push` only after reviewing the dry run.

## CI Checks

The fast CI path does not need Docker. It runs:

```bash
pnpm run supabase:version
pnpm run supabase:verify
```

The manual workflow dispatch path runs the local Docker-backed migration drill.

## Enforcement

`pnpm run supabase:verify` checks:

- the Supabase CLI is pinned,
- `supabase/config.toml` exists and is AXXESS-specific,
- existing seed files are wired into local reset,
- migration names follow the repository timestamp convention,
- public tables created by migrations have RLS coverage,
- new migrations do not use `auth.role()` or `using (true)`,
- the Sprint 25 token vault is not granted authenticated table access.

## Notes

The current migration history includes one legacy warning in the first schema migration for a permissive profile-read policy. The verifier preserves that historical warning while enforcing stricter rules for Sprint 25 and later migrations.
