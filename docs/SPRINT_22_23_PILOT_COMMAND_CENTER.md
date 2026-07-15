# Sprint 22 and 23 - Pilot Command Center And Governed AI Operations

Sprint 22 and Sprint 23 move AXXESS from separate platform control surfaces into an operator-ready pilot command layer. The work preserves the existing UI and architecture while connecting readiness, connector actions, AI review, sandbox policy, RAG evaluation, and audit evidence into one tenant-governed operating model.

## Sprint 22 - Pilot Command Center And Connector Execution Queue

### Completed

- Added a Pilot Command Center service that composes platform readiness, usage limits, plugin runtime posture, connector action decisions, sandbox dry-runs, and RAG evaluation fixtures.
- Added `GET /api/admin/pilot-command-center` for organization administrators.
- Added an admin route at `/admin/pilot-command-center` using the existing enterprise admin page pattern.
- Added connector execution queue semantics for tenant-owned plugin actions, approval-gated writes, provider gaps, and audit evidence.
- Added Supabase tables for command-center snapshots and connector execution queue records with tenant-scoped RLS.

## Sprint 23 - Governed AI Review, Sandbox Evidence, And RAG Evaluation

### Completed

- Added governed AI operation review evidence for cited answers that require human approval before consequential actions.
- Added sandbox policy attestation primitives for Kubernetes-grade, Vercel Sandbox, Docker, CI, and local execution evidence.
- Added RAG evaluation run persistence for permission fixtures, source coverage, confidence thresholds, and regression findings.
- Added focused service, route, and RLS tests for the Sprint 22/23 layer.

## Database Schema

Migration:

- `supabase/migrations/202607150001_sprint22_23_pilot_command_center.sql`

New tables:

- `pilot_command_center_snapshots`
- `ai_operation_reviews`
- `connector_execution_queue`
- `sandbox_policy_attestations`
- `rag_evaluation_runs`

All tables are tenant-scoped through `organization_id`, RLS-enabled, and protected by role-aware policies. The migration avoids authentication-only policies, avoids `auth.role()`, and does not expose unrestricted rows.

## API Surface

- `GET /api/admin/pilot-command-center`

## Definition Of Done

An organization administrator can now inspect a unified pilot command snapshot covering live readiness, connector action approval state, governed AI review, sandbox policy posture, RAG evaluation evidence, usage posture, and audit-backed next actions.

## Provider-Gated

- Actual connector execution still requires OAuth credentials, encrypted token references, and provider sync workers.
- Actual sandbox execution still requires an approved runner integration.
- RAG evaluation persistence requires the Sprint 22/23 migration to be applied to the connected Supabase project.

## Recommended Sprint 24

- Connect the first real provider callback/token exchange end to end.
- Persist command-center snapshots from a scheduled job.
- Add a tenant-facing AI review inbox with approve, edit, reject, and audit outcomes.
- Add one approved sandbox runner behind policy attestation.
- Convert RAG evaluation fixtures into CI and release gates.
