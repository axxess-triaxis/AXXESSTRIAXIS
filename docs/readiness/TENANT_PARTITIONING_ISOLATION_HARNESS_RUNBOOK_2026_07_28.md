# Tenant Partitioning -- Isolation Harness Runbook (Sprint TP-3, 2026-07-28)

Date: 2026-07-28
Governance source: Codex's "Sprint TP-3" prompt.
Script: `scripts/verify-two-tenant-isolation.mjs`

## Safety Classification

**Not read-only. Writes and deletes real rows.** The script:
1. Creates two throwaway organizations and one real Supabase Auth user per organization
   (via the Admin API, service-role key).
2. As each tenant's user, creates one real row each in `projects`, `tasks`, `documents`,
   `knowledge_articles`, `audit_logs`, `workflow_timeline_events`.
3. Attempts cross-tenant reads and writes against those rows using the *other* tenant's real
   access token, so real RLS policies decide the outcome -- not application code.
4. Best-effort deletes every row/user/org it created.

The script's own header is explicit: **"Never run this against a real production project with
real tenant data."** This is a genuine write-and-cleanup harness, not a passive check.

**Per Sprint TP-3's own non-negotiable** ("Do not run test harnesses against production unless
they are strictly read-only and explicitly safe") -- **this harness does not qualify** and was
not run against `landing.triaxisventures.com`'s production Supabase project.

## Required Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `SUPABASE_ANON_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY`

## Database Target Rules

- **Never** the production project backing `landing.triaxisventures.com` / `investor.triaxisventures.com`.
- Safe targets only: a local Supabase instance (Docker-backed), or a dedicated non-production
  Supabase branch/staging project.

## Current Environment Check (2026-07-28)

| Requirement | Status | Evidence |
|---|---|---|
| Docker daemon running | **No** | `docker info` -- CLI present (v29.6.2) but `Server:` section reports `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine ... daemon is running: open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.` Exit code 1. |
| Linked non-production Supabase project | **No** | `supabase/.temp/project-ref` does not exist in this checkout. |
| `SUPABASE_ACCESS_TOKEN` set | **No** | Not present in this environment. |

**Conclusion: blocked.** Neither safe target (local Docker Supabase, or a linked
non-production/staging project) is available in this environment. Consistent with every prior
sprint's finding on this exact point (Sprint 3, Sprint 5, RAG Remediation) -- this is not a new
blocker, it is the same one, re-confirmed.

## Exact Run Command (Once Unblocked)

**Option A -- local Supabase (requires Docker Desktop running):**
```bash
pnpm exec supabase start
pnpm run supabase:db:reset
# Export NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
# from `pnpm exec supabase status -o env`
pnpm run supabase:verify:two-tenant-isolation
pnpm exec supabase stop --no-backup
```

**Option B -- linked non-production/staging Supabase project:**
```bash
pnpm run supabase:link -- --project-ref <staging-project-ref>
# Pull that project's own URL/anon key/service-role key (Supabase Dashboard, or
# `vercel env pull` if the same project backs a non-production Vercel project)
pnpm run supabase:verify:two-tenant-isolation
```

Both are founder/HITL actions -- creating a dedicated non-production Supabase project or enabling
a local Docker daemon are outside this agent's own operating constraints (no account creation, no
entering credentials).

## Expected Pass Criteria

The script prints a JSON summary. `status` is `"passed"` only if **every** resource in
`REQUIRED_COVERAGE` (`projects`, `tasks`, `documents`, `knowledge_articles`, `audit_logs`,
`workflow_timeline_events`) reports both `crossTenantReadBlocked: true` and
`crossTenantWriteBlocked: true`. Any `false` is a real tenant-isolation failure and must block a
release -- it is not something to note and move past.

## Blocker

**Blocked on environment**, as of 2026-07-28: no Docker daemon running, no linked non-production
Supabase project, no `SUPABASE_ACCESS_TOKEN`. This was not run this sprint. A-10 remains `Blocked`
in the actionables matrix -- not marked `Yes`, per this sprint's own instruction not to claim
success without an actual run.
