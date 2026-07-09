# Data Retention

Default beta retention targets:

- Audit logs: retained for pilot evidence unless legal review requires deletion or masking.
- User account data: retained until deletion request is approved and completed.
- Private documents: retained by tenant policy.
- Analytics events: sanitized and retained according to provider configuration.
- AI output audit: retained with prompt/source evidence for governance review.

Tenant-specific retention policies should be configured in `retention_policies`.
