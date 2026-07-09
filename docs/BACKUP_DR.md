# Backup and Disaster Recovery

Sprint 12 defines the backup and disaster recovery foundation for enterprise pilots.

## Recovery Objectives

Recommended targets for pilot environments:

- RPO: 24 hours initially, 1 hour for regulated pilots.
- RTO: 4 hours initially, 1 hour for regulated pilots.

These targets must be confirmed with cloud provider capabilities and contract obligations.

## Assets To Protect

- Supabase Postgres data.
- Supabase Auth users and sessions.
- Supabase Storage objects.
- Vector index manifests and future embeddings.
- Deployment environment variables.
- Audit logs.
- Prompt registry and AI output audit evidence.
- Release artifacts.

## Required Backups

- Daily database backups.
- Point-in-time recovery where available.
- Private storage object snapshots.
- Exported schema migrations.
- Encrypted environment variable inventory.
- Release tags and deployment references.

## Restore Runbook

1. Declare incident owner.
2. Freeze destructive operations.
3. Identify affected tenant and time window.
4. Snapshot current state.
5. Restore database to isolated recovery environment.
6. Validate tenant, audit, privacy, and document consistency.
7. Restore storage objects.
8. Rebuild vector/search indexes.
9. Promote recovered state.
10. Record incident audit and customer-facing report.

## Drill Cadence

- Monthly restore drill for beta.
- Quarterly recovery drill for enterprise production.
- Per-release backup verification once regulated tenants are onboarded.
