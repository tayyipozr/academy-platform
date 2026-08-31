#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(
  cd "$(dirname "${BASH_SOURCE[0]}")/../.."
  pwd
)"

cd "$PROJECT_ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"

docker compose \
  --env-file "$ENV_FILE" \
  -f compose.production.yaml \
  run \
  --rm \
  certbot renew \
  --webroot \
  --webroot-path=/var/www/certbot \
  --quiet

docker compose \
  --env-file "$ENV_FILE" \
  -f compose.production.yaml \
  exec \
  -T \
  nginx \
  nginx -s reload
