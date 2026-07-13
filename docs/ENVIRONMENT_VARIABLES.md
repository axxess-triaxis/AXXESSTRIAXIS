# Environment Variables

See `.env.example` for the complete template.

## Public Browser/Mobile Values

Variables prefixed with `NEXT_PUBLIC_` or `EXPO_PUBLIC_` are visible in clients. They may contain public URLs, publishable anon keys, feature flags, and analytics project keys.

## Server-Only Values

Never expose:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `RESEND_WEBHOOK_SECRET`
- AI provider secret keys
- Apple/Google signing credentials
- KMS or audit salts

## Analytics Provider

```text
NEXT_PUBLIC_ANALYTICS_PROVIDER=noop|posthog|mixpanel|auto
```

Default is `noop`.

## Demo Mode

Use Demo Mode only for preview deployments:

```text
NEXT_PUBLIC_AXXESS_DEMO_MODE=true
```

Production customer tenants should keep Demo Mode disabled.

## Sprint 18 Operations

```text
RESEND_WEBHOOK_SECRET=
AXXESS_AUDIT_EXPORT_TTL_MINUTES=60
```

Use `RESEND_WEBHOOK_SECRET` only on the server to verify invitation delivery webhooks. `AXXESS_AUDIT_EXPORT_TTL_MINUTES` controls the short-lived server export token window for governed audit CSV exports.
