# Backup Restore Drill

Scripts:

- `scripts/db/backup-staging.sh`
- `scripts/db/restore-staging.sh`
- `scripts/db/verify-restore.sql`

## Backup

```bash
AXXESS_ENVIRONMENT=staging SUPABASE_DB_URL=... scripts/db/backup-staging.sh
```

## Restore

```bash
AXXESS_ENVIRONMENT=staging AXXESS_CONFIRM_RESTORE=RESTORE_STAGING SUPABASE_DB_URL=... scripts/db/restore-staging.sh backups/file.dump
```

The restore script refuses to run without explicit staging confirmation.

## Verification

Run:

```bash
psql "$SUPABASE_DB_URL" -f scripts/db/verify-restore.sql
```
