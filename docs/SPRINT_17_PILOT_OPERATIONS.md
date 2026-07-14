# Sprint 17 Pilot Operations

Sprint 17 turns the Sprint 16 pilot-readiness surfaces into operational workflows. It preserves the existing architecture and adds server-side persistence, optional transactional invite delivery, mobile review ergonomics, and focused test coverage.

## What Changed

### Pilot Readiness Events

`POST /api/pilot-readiness-events` records onboarding completion events for the active tenant.

The route:

- Resolves the session server-side.
- Uses the user's Supabase access token for the insert.
- Relies on RLS for tenant isolation.
- Accepts only stable onboarding step IDs.
- Sanitizes event metadata before storage.
- Writes a lightweight audit entry.

### Invitation Delivery

`POST /api/invitations` now attempts transactional email delivery after the invitation record is created.

The implementation uses the Resend HTTP API when `RESEND_API_KEY` is configured. If email is not configured, the invitation is still created and the API returns a manual acceptance URL to the administrator.

Required for real email delivery:

```text
RESEND_API_KEY
AXXESS_INVITATION_EMAIL_FROM
NEXT_PUBLIC_APP_URL
```

Optional:

```text
AXXESS_INVITATION_EMAIL_REPLY_TO
```

### Mobile Admin Review

Organization Admin and Audit Logs now include mobile card layouts so pilot teams can review:

- Users
- Roles
- Departments
- Audit actions
- Audit resources
- Evidence identifiers

without relying on desktop-width tables.

## Verification

Sprint 17 adds coverage for:

- Invitation email rendering and Resend request shape.
- Pilot readiness API validation, RLS-preserving insert strategy, and audit logging.
- Invitation API delivery status and raw-token audit safety.
- Onboarding client persistence call.
- Seed-gated Playwright flows for mobile Organization Admin and Audit Log filtering.

Expected verification:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

## Remaining Risks

- Invitation delivery status webhooks are not implemented yet.
- Pilot readiness analytics are persisted but not yet summarized in a dashboard.
- Audit exports are still browser CSV exports; regulated export records should move server-side.
