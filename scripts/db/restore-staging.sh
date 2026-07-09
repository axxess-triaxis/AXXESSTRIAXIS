#!/usr/bin/env bash
set -euo pipefail

if [[ "${AXXESS_ENVIRONMENT:-}" != "staging" ]]; then
  echo "Refusing to run restore unless AXXESS_ENVIRONMENT=staging."
  exit 1
fi

if [[ "${AXXESS_CONFIRM_RESTORE:-}" != "RESTORE_STAGING" ]]; then
  echo "Refusing to restore. Set AXXESS_CONFIRM_RESTORE=RESTORE_STAGING after confirming target database."
  exit 1
fi

if [[ -z "${SUPABASE_DB_URL:-}" || -z "${1:-}" ]]; then
  echo "Usage: SUPABASE_DB_URL=... AXXESS_ENVIRONMENT=staging AXXESS_CONFIRM_RESTORE=RESTORE_STAGING scripts/db/restore-staging.sh backups/file.dump"
  exit 1
fi

pg_restore --clean --if-exists --no-owner --no-privileges --dbname "$SUPABASE_DB_URL" "$1"
echo "Restore completed from: $1"
