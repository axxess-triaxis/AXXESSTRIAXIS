# Sprint 28 - Pilot Release Gates, Microsoft Import Parity, And Timeline Evidence

Sprint 28 hardens the live pilot workflow introduced in Sprint 27. The emphasis is not a UI redesign; it is making the governed workflow more real, more auditable, and more release-ready.

## What Changed

- Added dedicated `approval_requests`, `stakeholder_notes`, and `project_updates` repositories.
- Updated approved AI review actions so each action type can create the right business record.
- Added live Microsoft Graph selected-message import parity with Gmail.
- Added `dashboard_snapshot_deltas` so command-center snapshots produce delta evidence.
- Added `audit_export_timeline_links` so audit exports can reference workflow timeline provenance.
- Added a dedicated Pilot Golden Path Release Gate workflow for the Sprint 27 Playwright spec.

## Database Schema

New Supabase tables:

- `approval_requests`
- `stakeholder_notes`
- `project_updates`
- `microsoft_selected_message_imports`
- `dashboard_snapshot_deltas`
- `audit_export_timeline_links`

All new public tables enable RLS and use explicit grants. Policies rely on tenant membership and role-aware checks rather than broad authenticated access.

## Microsoft Graph Import Flow

1. Tenant connects Microsoft through OAuth.
2. OAuth callback stores encrypted token material through the token vault.
3. A user submits one selected Microsoft message ID.
4. AXXESS fetches exactly that message through Microsoft Graph.
5. AXXESS previews tasks, decisions, stakeholders, tags, and summary.
6. No records are created until the user confirms.
7. On confirmation, AXXESS creates a document, creates candidate tasks, writes audit evidence, updates golden-path progress, and records timeline events.

## Review Action Flow

Approved AI output can now create:

- Task
- Approval request
- Stakeholder note
- Project update
- Meeting follow-up

Each action writes timeline evidence and audit metadata linking the source review, citations, decision, and created record.

## Release Gate

Added:

- `.github/workflows/pilot-golden-path-release-gate.yml`

The workflow runs:

```bash
pnpm exec playwright test tests/e2e/sprint27-golden-path.spec.ts
```

After this workflow is merged to `main`, repository branch protection should mark `Pilot Golden Path Release Gate / Sprint 27 Golden Path Gate` as required for pilot-release PRs.

## Provider-Gated Items

- Microsoft Graph live import requires Microsoft OAuth credentials.
- Token vault operations require `AXXESS_TOKEN_VAULT_KEY`.
- Live persistence requires Supabase service-role runtime on server routes.
- GitHub required-check enforcement must be configured in repository settings after the new workflow exists on `main`.

## Verification

Sprint 28 adds focused coverage for:

- Microsoft Graph selected-message parsing and fetch calls.
- Dedicated approval/stakeholder/project review actions.
- Dashboard snapshot delta calculations.
- Audit export timeline linkage source checks.
- Supabase RLS expectations for all Sprint 28 tables.
