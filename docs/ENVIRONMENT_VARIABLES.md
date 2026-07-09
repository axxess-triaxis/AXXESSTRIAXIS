# Environment Variables

See `.env.example` for the complete template.

## Public Browser/Mobile Values

Variables prefixed with `NEXT_PUBLIC_` or `EXPO_PUBLIC_` are visible in clients. They may contain public URLs, publishable anon keys, feature flags, and analytics project keys.

## Server-Only Values

Never expose:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
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
