# Mixpanel

Mixpanel remains supported through the analytics abstraction.

## Current Status

As of 2026-08-15, Mixpanel is live for the Investor Demo deployment.

- Code-wired: Yes.
- Investor Demo production env configured: Yes.
- Fresh deploy after env setup: Yes.
- Live event/user data received by Mixpanel: Yes.
- Session replay: Not connected / not enabled.
- Autocapture: likely not enabled through the current app path.

Evidence: founder-provided Mixpanel setup screenshot on 2026-08-15 showed "Some connections found"
with Events and Users connected, while Replays remained disconnected. This matches the current AXXESS
implementation: events are sent through `MixpanelAnalyticsProvider`, not through the raw Mixpanel
browser snippet with `autocapture: true` or `record_sessions_percent: 100`.

## Enable

```text
NEXT_PUBLIC_ANALYTICS_PROVIDER=mixpanel
NEXT_PUBLIC_MIXPANEL_TOKEN=
NEXT_PUBLIC_ANALYTICS_DISABLED=false
```

## Privacy Rules

AXXESS does not send raw prompts, document body text, notes, passwords, secrets, tokens, email, phone, or address fields through analytics by default.

## Naming Convention

Use lower snake case event names from `src/services/analytics/types.ts`.

Examples:

- `sign_up_started`
- `login_completed`
- `mfa_enrolled`
- `organization_created`
- `workspace_created`
- `rag_query_submitted`
- `prompt_approved`
- `account_deletion_started`
