# API Notes

AXXESS currently uses Next.js route handlers for server-side API entry points.

## Existing Route Areas

- Auth session, login, logout.
- Invitations and invitation acceptance.
- Pilot readiness event capture.
- Repository resource access.
- Beta feedback.
- Audit logs.
- Notifications.
- Document signed storage URL.

## Security Requirements

All API routes that read or mutate tenant resources must:

- Resolve the authenticated session server-side.
- Resolve organization and role from trusted server data.
- Check tenant and organization boundaries.
- Avoid trusting client-provided role values.
- Write audit events for sensitive actions.
- Return user-safe errors instead of backend internals.

## Sprint 17 API Routes

### `POST /api/pilot-readiness-events`

Persists first-tenant onboarding and pilot conversion events into `pilot_readiness_events`.

- Requires a server-resolved Supabase session.
- Uses the authenticated user's access token for the Supabase REST insert so RLS remains active.
- Accepts stable `stepId` values only.
- Sanitizes metadata through the analytics sanitizer before persistence.
- Writes a lightweight audit event for governance review.

### `POST /api/invitations`

Creates a tokenized invitation, writes audit/notification records, and attempts optional invitation email delivery.

- Uses `RESEND_API_KEY` only on the server when configured.
- Returns `emailDelivery: "sent" | "failed" | "not-configured"`.
- Returns a manual `invitationUrl` only when email delivery is not configured.
- Never writes the raw invitation token into audit metadata.

## Sprint 12 Guardrails

Use:

- `src/security/tenantGuard.ts` for organization and tenant checks.
- `src/security/enterpriseIam.ts` for enterprise permission decisions.
- `src/security/auditIntegrity.ts` for security event chain hashes.

## Future API Work

- Add typed request/response schemas for every route.
- Add rate limits.
- Add per-route audit classification.
- Add OpenAPI export.
- Add PostHog API latency capture.
