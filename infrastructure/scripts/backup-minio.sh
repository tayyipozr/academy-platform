#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(
  cd "$(dirname "${BASH_SOURCE[0]}")/../.."
  pwd
)"

cd "$PROJECT_ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PROJECT_ROOT/backups/minio/$TIMESTAMP"

mkdir -p "$BACKUP_DIR"

set -a
source "$ENV_FILE"
set +a

docker compose \
  --env-file "$ENV_FILE" \
  -f compose.production.yaml \
  run \
  --rm \
  -v "$BACKUP_DIR:/backup" \
  minio-init \
  /bin/sh -c '
    ACCESS_KEY="$(cat /run/secrets/minio_access_key)"
    SECRET_KEY="$(cat /run/secrets/minio_secret_key)"

    mc alias set source \
      http://minio:9000 \
      "$ACCESS_KEY" \
      "$SECRET_KEY"

    mc mirror \
      --overwrite \
      "source/$MEDIA_BUCKET" \
      /backup
  '

tar \
  -czf "${BACKUP_DIR}.tar.gz" \
  -C "$(dirname "$BACKUP_DIR")" \
  "$(basename "$BACKUP_DIR")"

rm -rf "$BACKUP_DIR"

sha256sum "${BACKUP_DIR}.tar.gz" \
  > "${BACKUP_DIR}.tar.gz.sha256"

find "$PROJECT_ROOT/backups/minio" \
  -type f \
  -mtime +30 \
  -delete

echo "MinIO backup created:"
echo "${BACKUP_DIR}.tar.gz"
