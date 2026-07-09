# API Notes

AXXESS currently uses Next.js route handlers for server-side API entry points.

## Existing Route Areas

- Auth session, login, logout.
- Invitations and invitation acceptance.
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
