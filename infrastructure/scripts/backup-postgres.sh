#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(
  cd "$(dirname "${BASH_SOURCE[0]}")/../.."
  pwd
)"

cd "$PROJECT_ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PROJECT_ROOT/backups/postgres"

mkdir -p "$BACKUP_DIR"

set -a
source "$ENV_FILE"
set +a

OUTPUT_FILE="$BACKUP_DIR/academy-${TIMESTAMP}.dump"

echo "Creating PostgreSQL backup..."

docker compose \
  --env-file "$ENV_FILE" \
  -f compose.production.yaml \
  exec \
  -T \
  postgres \
  pg_dump \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --format=custom \
    --compress=9 \
    --no-owner \
    --no-privileges \
  > "$OUTPUT_FILE"

test -s "$OUTPUT_FILE"

sha256sum "$OUTPUT_FILE" \
  > "${OUTPUT_FILE}.sha256"

find "$BACKUP_DIR" \
  -type f \
  -mtime +30 \
  -delete

echo "PostgreSQL backup created:"
echo "$OUTPUT_FILE"
