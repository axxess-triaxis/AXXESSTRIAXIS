# Vercel Deployment

AXXESS web remains a root-level Next.js app. Do not set the Vercel root directory to `apps/web`.

## Build Settings

- Framework: Next.js
- Install: `pnpm install --frozen-lockfile`
- Build: `pnpm run build`
- Dev: `pnpm run dev`

`vercel.json` preserves this root deployment path.

## Required Environment Variables

Public:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_AXXESS_AUTH_SHELL`
- `NEXT_PUBLIC_AXXESS_DEMO_MODE`
- `NEXT_PUBLIC_AXXESS_APP_VERSION`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_ANALYTICS_PROVIDER`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `NEXT_PUBLIC_MIXPANEL_TOKEN`
- `NEXT_PUBLIC_ANALYTICS_DISABLED`

Server-only:

- `SUPABASE_SERVICE_ROLE_KEY`
- `AXXESS_KMS_KEY_ALIAS`
- `AXXESS_AUDIT_HASH_SALT`
- AI provider keys where enabled

Never expose service-role or provider secret keys through `NEXT_PUBLIC_*`.

## Demo Mode

Use `NEXT_PUBLIC_AXXESS_DEMO_MODE=true` for investor preview deployments only. Keep it `false` for production tenants.

## Security Headers

`next.config.mjs` disables the powered-by header and sets CSP, Referrer Policy, X-Content-Type-Options, X-Frame-Options, and Permissions-Policy.
