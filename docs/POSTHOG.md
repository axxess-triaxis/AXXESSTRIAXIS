# PostHog

PostHog can be selected without code changes.

## Enable

```text
NEXT_PUBLIC_ANALYTICS_PROVIDER=posthog
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_ANALYTICS_DISABLED=false
```

## Web Adapter

The web adapter is dependency-free and posts sanitized capture events to the configured PostHog host.

## Mobile

Mobile uses the same public environment variable strategy. Add the official PostHog React Native SDK later if mobile session replay or native autocapture is required.

## Privacy

PostHog receives sanitized event properties only. Raw document text, prompts, notes, and PII are blocked by default.
