#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <backup.tar.gz>" >&2
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

PROJECT_ROOT="$(
  cd "$(dirname "${BASH_SOURCE[0]}")/../.."
  pwd
)"

cd "$PROJECT_ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
RESTORE_DIR="$(mktemp -d)"

trap 'rm -rf "$RESTORE_DIR"' EXIT

tar -xzf "$BACKUP_FILE" \
  -C "$RESTORE_DIR"

SOURCE_DIR="$(
  find "$RESTORE_DIR" \
    -mindepth 1 \
    -maxdepth 1 \
    -type d |
  head -n 1
)"

read -r -p \
  "Type RESTORE to restore MinIO objects: " \
  confirmation

if [ "$confirmation" != "RESTORE" ]; then
  echo "Restore cancelled."
  exit 1
fi

docker compose \
  --env-file "$ENV_FILE" \
  -f compose.production.yaml \
  run \
  --rm \
  -v "$SOURCE_DIR:/restore:ro" \
  minio-init \
  /bin/sh -c '
    ACCESS_KEY="$(cat /run/secrets/minio_access_key)"
    SECRET_KEY="$(cat /run/secrets/minio_secret_key)"

    mc alias set destination \
      http://minio:9000 \
      "$ACCESS_KEY" \
      "$SECRET_KEY"

    mc mirror \
      --overwrite \
      /restore \
      "destination/$MEDIA_BUCKET"
  '

echo "MinIO restore completed."
