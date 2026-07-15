# Sprint 24 - Live AI Review, OAuth, Sandbox Runner, And RAG Release Gates

Sprint 24 closes the loop opened by Sprint 22/23. It turns the Pilot Command Center into an operational control layer by adding a tenant-facing AI review inbox, one real OAuth callback/token exchange path, scheduled command-center snapshots, approved sandbox runner evidence, and RAG evaluation release gates.

## Completed

- Added tenant-facing AI Review Inbox route at `/ai-workspace/review-inbox`.
- Added `GET /api/ai/reviews` and `POST /api/ai/reviews` for review queue reads and decisions.
- Added signed OAuth state generation, callback verification, token exchange, connection upsert, and token-reference storage for Gmail/Microsoft connector flows.
- Added `GET /api/connectors/oauth/callback` for the OAuth callback path.
- Added daily Vercel Cron route at `/api/cron/pilot-command-center-snapshot`, guarded by `CRON_SECRET`.
- Added `POST /api/admin/pilot-command-center/snapshot` for manual admin snapshot persistence.
- Added approved sandbox runner path at `POST /api/execution/jobs/run`, gated by sandbox policy attestation.
- Added RAG release gate evaluator and `GET/POST /api/rag/evaluation`.
- Added Sprint 24 Supabase migration for OAuth state, sandbox runner invocations, and RAG release gates.

## Database Schema

Migration:

- `supabase/migrations/202607150002_sprint24_live_review_oauth_sandbox_gates.sql`

New tables:

- `oauth_connection_states`
- `sandbox_runner_invocations`
- `rag_release_gates`

Updated table:

- `integration_connections` now supports `token_expires_at`, `oauth_state_hash`, `connected_at`, and `connection_health`.

## Security Model

- OAuth callback state is signed and tenant-bound.
- Raw OAuth access and refresh tokens are not stored by application code.
- Integration records store a token reference and token hashes only.
- Cron route requires `Authorization: Bearer ${CRON_SECRET}`.
- Sandbox runner execution remains blocked unless policy attestation is approved and unexpired.
- RAG release gates fail on unauthorized source retrieval or missing expected citations.

## Provider-Gated

- OAuth exchange requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, or `MICROSOFT_CLIENT_SECRET` depending on provider.
- Scheduled command-center snapshots require `CRON_SECRET`, `AXXESS_COMMAND_CENTER_ORGANIZATION_ID`, and `AXXESS_COMMAND_CENTER_USER_ID`.
- Actual non-dry-run sandbox execution requires a provisioned runner and tenant approval.

## Recommended Sprint 25

- Complete encrypted token vault integration for OAuth refresh/access material.
- Add Gmail selected-message import from the live Gmail API.
- Add a visual AI review inbox entry point from the main AI Workspace.
- Run command-center snapshots for all active pilot tenants instead of one configured tenant.
- Promote RAG release gates into CI-required checks for production releases.
