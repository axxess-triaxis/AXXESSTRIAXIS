# Supabase CLI Integration

AXXESS manages Supabase through a repo-local CLI dependency, pinned in `package.json`.

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

## Linked Project Dry Run

```bash
pnpm run supabase:link -- --project-ref <project-ref>
pnpm run supabase:db:dry-run
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
