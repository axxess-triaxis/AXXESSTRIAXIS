# Privacy Analytics

AXXESS Product Release 0.6 analytics is designed to track product usage metadata, not sensitive business content.

## Tracked

- Tenant and user identifiers
- User role
- Module and route metadata
- Workflow status, priority, counts, and safe IDs
- Feedback type, module, rating, and permission-to-contact flag
- Release and environment metadata

## Not Tracked

- Document contents
- Meeting notes
- Project or task descriptions
- Feedback message text
- Emails
- Phone numbers
- Passwords, tokens, keys, or secrets
- Confidential organization information

## Controls

- `MockAnalyticsProvider` is used when no Mixpanel token is configured.
- `NEXT_PUBLIC_ANALYTICS_DISABLED=true` disables Mixpanel initialization.
- Event properties are sanitized centrally before provider dispatch.
- Feedback messages are stored in Supabase only.
- Admin pages remain role-protected.
