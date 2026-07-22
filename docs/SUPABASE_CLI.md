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

## Two-Tenant Isolation Harness (Sprint 5)

`scripts/verify-two-tenant-isolation.mjs` (`pnpm run supabase:verify:two-tenant-isolation`) is a scripted, repeatable check that goes beyond static RLS-policy review: it creates two real throwaway organizations with two real signed-in Supabase Auth users, has one create a project/task/document/knowledge article/audit log/workflow timeline event, then confirms the other genuinely cannot read or mutate any of it -- using real PostgREST requests with each user's own access token, so real RLS policies decide the outcome, not application code.

This is opt-in and mutates whatever Supabase project it's pointed at (creating and then deleting real rows), so it is never part of `supabase:verify` or the default verification suite. Requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` for a local (`supabase start`) or linked/branch project -- never point it at a real production project with real tenant data. See the script's own header comment for the full local/linked-project runbook.

**As of Sprint 5, this harness has been written but not executed** -- this checkout has no linked remote Supabase project and no local Docker daemon was available in this session's environment. Its existence closes the "no scripted two-tenant test exists" gap identified in `docs/SPRINT_1_TO_4_GAP_ANALYSIS_2026_07_22.md`; an actual run against local or branch Supabase remains a Sprint 6+ follow-up, and only that run's printed JSON result counts as "two-tenant isolation verified," not the script's presence.

## Notes

The current migration history includes one legacy warning in the first schema migration for a permissive profile-read policy. The verifier preserves that historical warning while enforcing stricter rules for Sprint 25 and later migrations.

### The `permissions_authenticated_select` `using (true)` Warning, Explained (Sprint 5)

The one permissive-RLS warning `supabase:verify` has reported since before Sprint 1 is `20260702165736_initial_enterprise_schema.sql`'s `permissions_authenticated_select` policy: `on public.permissions for select to authenticated using (true)`.

This is safe, not a legacy vulnerability, and does not need a corrective migration. `public.permissions` (`id`, `resource`, `action`, `description`) has no `organization_id`, `user_id`, or any other tenant/user-identifying column at all -- it is a global, static catalog of permission definitions (e.g. `resource: "projects", action: "create"`), the same for every tenant, referenced by `role_permissions` to build up each organization's own role-to-permission mapping. There is no tenant boundary for `using (true)` to violate here, unlike every other table in the schema, which is why the verifier's strict/legacy split (`isStrictMigration`, `scripts/verify-supabase-migrations.mjs`) correctly keeps this as a permanent, allowed warning for pre-Sprint-25 migrations rather than a hard failure -- any *new* migration attempting the same pattern on a genuinely tenant-scoped table still fails verification.
