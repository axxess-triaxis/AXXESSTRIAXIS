# Sprint 18 Pilot Conversion Operations

Sprint 18 turns pilot readiness events into an operational conversion layer for administrators, account owners, and sponsor-review meetings. The implementation preserves the existing AXXESS interface and adds backend evidence where the previous sprint still had local-only behavior.

## Scope

- Pilot Conversion dashboard.
- Tenant-scoped pilot health scoring.
- Governed server-side audit export records.
- Signed invitation delivery webhook ingestion.
- Supabase RLS migration for new evidence tables.
- Mobile screenshot workflow for admin review surfaces.

## Pilot Conversion Dashboard

Route:

```text
/admin/pilot-conversion
```

Access:

```text
Super Admin
Organization Admin
```

The dashboard reads `pilot_readiness_events` through `GET /api/pilot-readiness-events`. If Supabase is not available or no events are present, it falls back to seeded investor-preview events so demos remain coherent without backend error states.

Health scoring is implemented in `src/services/pilot/pilotHealth.ts`.

Weighted signals:

- Organization confirmed.
- Pilot team invited.
- Roles assigned.
- First project created.
- First document uploaded.
- First AI/RAG question asked.
- First task created.
- First approval requested.
- Audit trail viewed.
- Feedback or support request sent.

## Governed Audit Exports

Route:

```text
POST /api/audit-exports
```

The route:

- Requires a server-resolved session.
- Allows only organization administrators.
- Reads audit logs through the tenant repository layer.
- Creates an `audit_exports` record with a hashed export token.
- Stores a SHA-256 hash of the generated CSV payload.
- Writes an `audit_export.created` audit event.
- Returns the CSV payload once to the requesting browser.

The Audit Logs screen still falls back to local CSV generation if the server export route is unavailable, preserving existing functionality while making the production path auditable.

## Invitation Delivery Evidence

Route:

```text
POST /api/webhooks/resend
```

Required server secret:

```text
RESEND_WEBHOOK_SECRET
```

Invitation emails now include provider tags:

```text
organization_id
invitation_id
```

The webhook stores:

- Organization ID.
- Invitation ID when available.
- Provider message ID.
- Delivery event type.
- Hashed recipient email.
- Minimal raw provider metadata.

Raw recipient emails are not stored in delivery evidence.

## Database Migration

Migration:

```text
supabase/migrations/202607120001_sprint18_pilot_conversion_audit_exports.sql
```

Tables:

```text
audit_exports
invitation_delivery_events
```

RLS:

- `audit_exports` can be selected and inserted by `Super Admin` and `Organization Admin`.
- `invitation_delivery_events` can be selected by `Super Admin` and `Organization Admin`.
- Authenticated users are not granted direct insert access to `invitation_delivery_events`.
- Webhook inserts use the server-side service role.

## Mobile Visual Regression

Workflow:

```text
.github/workflows/mobile-visual-regression.yml
```

Captured routes:

```text
/admin/organization?screenshot=true
/admin/audit-logs?screenshot=true
/admin/pilot-conversion?screenshot=true
```

Artifacts:

```text
mobile-admin-screenshots
```

## Verification

Expected checks:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

Focused Sprint 18 coverage includes:

- Pilot health scoring.
- Audit export route source guardrails.
- Resend webhook signature verification.
- Invitation email provider tags.
- Sprint 18 RLS expectations.
- Route metadata and RBAC restrictions.
- Mobile screenshot Playwright spec.

## Remaining Risks

- Export CSV is returned directly in the create response; a future sprint should add a dedicated token-validated download endpoint.
- Webhook delivery status is captured but not yet surfaced in the Organization Admin page.
- Screenshot workflow captures artifacts but does not yet compare against approved baselines.
