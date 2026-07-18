# Sprint 29 - Pilot Tenant Acceptance And Live Operations

Sprint 29 turns the Sprint 27/28 golden path into a customer-success acceptance process. The goal is to make a real pilot tenant reviewable, sign-off ready, and operable after the first meaningful workflow is completed.

## What Changed

- Added a pilot tenant acceptance engine that combines golden-path progress, pilot health, command-center evidence, and live workspace metrics.
- Added a Pilot Command Center acceptance panel with score, checklist, blockers, evidence gaps, live-ops handoffs, and operator actions.
- Added `GET /api/admin/pilot-acceptance` for role-protected acceptance reads.
- Added `POST /api/admin/pilot-acceptance` for recording acceptance snapshots, sponsor acceptance, and live-ops handoffs.
- Added durable Supabase evidence tables for acceptance runs, checklist rows, and live-ops events.
- Extended the Pilot Golden Path Release Gate to include the Sprint 29 acceptance smoke test.

## Database Schema

New Supabase tables:

- `pilot_tenant_acceptance_runs`
- `pilot_acceptance_checklist_items`
- `pilot_live_ops_events`

All new public tables enable RLS and use explicit grants. Policies allow tenant members to read acceptance evidence while restricting writes to `Super Admin` and `Organization Admin` roles. Service-role access is available for server-only persistence jobs.

## Acceptance Model

The acceptance score is computed from:

- Tenant/profile readiness
- Identity and RBAC readiness
- Knowledge ingestion and cited retrieval
- Human review controls
- Approved work, dashboard, and audit evidence
- Connector, sandbox, and RAG evaluation posture
- Recorded pilot acceptance evidence

The status values are:

- `accepted`
- `ready_for_acceptance`
- `needs_evidence`
- `blocked`

## Live-Ops Handoff

Sprint 29 creates operator handoff items for:

- Sponsor acceptance review
- Stuck golden-path recovery
- Connector and selected-message operations
- AI review operations monitoring
- RAG release gate and audit evidence

These handoffs give customer-success and platform operators a clear next action after the pilot tenant completes the first governed workflow.

## Admin Flow

1. Organization Admin opens `/admin/pilot-command-center`.
2. The Pilot Tenant Acceptance panel renders immediately from safe preview evidence.
3. If a live authenticated session exists, the panel hydrates from `/api/admin/pilot-acceptance`.
4. The operator records a handoff or pilot acceptance.
5. AXXESS persists the acceptance run, checklist items, live-ops event, and audit evidence when Supabase admin runtime is configured.
6. If provider runtime is not configured, the panel remains visible and explains that persistence is provider-gated.

## Release Gate

Updated:

- `.github/workflows/pilot-golden-path-release-gate.yml`

The workflow now runs:

```bash
pnpm exec playwright test tests/e2e/sprint27-golden-path.spec.ts tests/e2e/sprint29-pilot-acceptance.spec.ts
```

After this workflow is merged to `main`, repository branch protection should require `Pilot Golden Path Release Gate / Sprint 27/29 Pilot Acceptance Gate`.

## Provider-Gated Items

- Acceptance persistence requires Supabase service-role runtime.
- Live readiness events require the Sprint 16 pilot readiness migration.
- Command-center snapshot persistence requires Sprint 22/23 and Sprint 25 migrations.
- OAuth-backed connector evidence depends on configured provider credentials and token vault runtime.

## Verification

Sprint 29 adds coverage for:

- Pilot acceptance scoring and blocked clean-tenant behavior.
- Operator-recorded acceptance state.
- Protected admin API route expectations.
- Sprint 29 RLS migration expectations.
- Seed-gated Playwright coverage for the Pilot Command Center acceptance panel.
