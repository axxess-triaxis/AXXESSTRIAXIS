#!/usr/bin/env bash
set -euo pipefail

if [[ "${AXXESS_ENVIRONMENT:-}" != "staging" ]]; then
  echo "Refusing to run backup unless AXXESS_ENVIRONMENT=staging."
  exit 1
fi

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "SUPABASE_DB_URL is required."
  exit 1
fi

mkdir -p backups
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
output="backups/axxess-staging-${timestamp}.dump"

pg_dump "$SUPABASE_DB_URL" --format=custom --no-owner --no-privileges --file "$output"
echo "Created staging backup: $output"
