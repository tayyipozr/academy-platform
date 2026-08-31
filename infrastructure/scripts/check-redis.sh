#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(
  cd "$(dirname "${BASH_SOURCE[0]}")/../.."
  pwd
)"

cd "$PROJECT_ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"

OUTPUT="$(
  docker compose \
    --env-file "$ENV_FILE" \
    -f compose.production.yaml \
    exec \
    -T \
    redis \
    /bin/sh -c '
      redis-cli \
        -a "$(cat /run/secrets/redis_password)" \
        INFO persistence
    '
)"

echo "$OUTPUT"

echo "$OUTPUT" |
grep -q "aof_enabled:1"

echo "$OUTPUT" |
grep -q "aof_last_write_status:ok"

echo "Redis AOF persistence is healthy."
