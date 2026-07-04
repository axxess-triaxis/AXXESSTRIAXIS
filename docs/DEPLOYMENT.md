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
