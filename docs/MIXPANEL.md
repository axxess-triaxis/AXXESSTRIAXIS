# Mixpanel

Mixpanel remains supported through the analytics abstraction.

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
