#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(
  cd "$(dirname "${BASH_SOURCE[0]}")/../.."
  pwd
)"

cd "$PROJECT_ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"

set -a
source "$ENV_FILE"
set +a

echo "Checking Docker services..."

UNHEALTHY="$(
  docker compose \
    --env-file "$ENV_FILE" \
    -f compose.production.yaml \
    ps \
    --format json |
  grep -E \
    '"Health":"unhealthy"|"State":"exited"' \
    || true
)"

if [ -n "$UNHEALTHY" ]; then
  echo "$UNHEALTHY"
  echo "One or more services are unhealthy." >&2
  exit 1
fi

echo "Checking application endpoint..."

curl \
  --fail \
  --silent \
  --show-error \
  --max-time 10 \
  "https://${APP_DOMAIN}/backend/api/v1/system/ping" \
  > /dev/null

echo "Checking storage endpoint..."

curl \
  --fail \
  --silent \
  --show-error \
  --max-time 10 \
  "https://${STORAGE_DOMAIN}/minio/health/live" \
  > /dev/null

echo "Checking Redis persistence..."

"$PROJECT_ROOT/infrastructure/scripts/check-redis.sh" \
  > /dev/null

echo "All health checks passed."
