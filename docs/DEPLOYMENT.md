# Deployment

AXXESS is prepared for Vercel and container-based deployment.

## Build

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

## Required Public Variables

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_AXXESS_AUTH_SHELL
NEXT_PUBLIC_AXXESS_DEMO_MODE
NEXT_PUBLIC_AXXESS_APP_VERSION
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## Required Server Variables

```text
SUPABASE_SERVICE_ROLE_KEY
```

Do not expose service-role or provider secrets through `NEXT_PUBLIC_*` variables.

## Optional Server Variables

```text
RESEND_API_KEY
RESEND_WEBHOOK_SECRET
AXXESS_INVITATION_EMAIL_FROM
AXXESS_INVITATION_EMAIL_REPLY_TO
AXXESS_AUDIT_EXPORT_TTL_MINUTES
```

When `RESEND_API_KEY` is present, `/api/invitations` sends invitation emails through Resend's HTTP API. Without it, invitations still persist and return a manual acceptance URL to the inviting administrator.

`RESEND_WEBHOOK_SECRET` enables signed invitation delivery evidence through `/api/webhooks/resend`. `AXXESS_AUDIT_EXPORT_TTL_MINUTES` controls the short-lived audit export token window and defaults to 60 minutes.

## Investor Preview Deployment

For investor or sales demo deployments:

```text
NEXT_PUBLIC_AXXESS_DEMO_MODE=true
```

This loads the North East Health Mission tenant and enables production-safe demo fallback if Supabase data is unavailable.

## Production Customer Deployment

For live customer tenants:

```text
NEXT_PUBLIC_AXXESS_DEMO_MODE=false
NEXT_PUBLIC_AXXESS_AUTH_SHELL=true
```

Apply Supabase migrations, configure RLS, provide Auth credentials, and verify tenant-specific onboarding before inviting customer users.

## Deployment Notes

- Keep Demo Mode enabled only for preview environments.
- Keep Supabase Storage buckets private and use signed URLs.
- Confirm RLS policies before connecting real tenant data.
- Verify protected routes after every deployment.
- Review audit-log writes for authentication, invitations, business actions, and RAG answers.
- Verify `pilot_readiness_events` is migrated before relying on pilot conversion analytics.
- Verify `audit_exports` and `invitation_delivery_events` are migrated before enabling Sprint 18 pilot conversion review.
- Upload mobile visual regression artifacts from CI when reviewing admin/audit/conversion UI changes.
