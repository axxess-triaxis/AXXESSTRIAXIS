# AXXESS Supabase

AXXESS uses Supabase for Auth, Postgres, Row Level Security, Storage, migration history, and tenant-backed enterprise workflows.

The repository now includes a pinned Supabase CLI dev dependency. Do not rely on a global `supabase` binary.

## Repo-Local CLI

```bash
pnpm install
pnpm run supabase:version
pnpm run supabase:verify
```

Pinned CLI version:

```text
supabase 2.109.1
```

## Creating Migrations

Use the CLI so migration timestamps are generated consistently:

```bash
pnpm run supabase:migration:new -- descriptive_name
```

Then edit the generated SQL under `supabase/migrations`.

## Local Validation

Fast static validation:

```bash
pnpm run supabase:verify
```

Full local database validation requires Docker and a running Supabase stack:

```bash
pnpm exec supabase start
pnpm run supabase:db:reset
pnpm run supabase:db:lint
pnpm run supabase:test:rls
pnpm exec supabase stop --no-backup
```

## Linked Project Validation

Linking writes local state under `supabase/.temp`, which is ignored by git.

```bash
pnpm run supabase:link -- --project-ref <project-ref>
pnpm run supabase:db:dry-run
```

Only push migrations after dry-run review:

```bash
pnpm run supabase:db:push
```

## Security Standards

- Never expose `SUPABASE_SERVICE_ROLE_KEY` through browser or mobile code.
- Every public table must have RLS enabled.
- Prefer explicit `GRANT` statements for Data API exposure.
- Do not use deprecated `auth.role()` in new policies.
- Do not use `using (true)` in new RLS policies.
- Keep generated local Supabase state out of git through `supabase/.gitignore`.

## CI

The `Supabase CLI Integration` workflow verifies:

- repo-local CLI availability,
- pinned CLI version,
- Supabase config presence,
- migration naming,
- RLS coverage,
- Sprint 25 token vault access constraints.

The workflow also includes a manual local migration drill for Docker-backed `db reset`, `db lint`, and pgTAP RLS tests.
