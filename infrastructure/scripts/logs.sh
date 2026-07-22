#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(
  cd "$(dirname "${BASH_SOURCE[0]}")/../.."
  pwd
)"

cd "$PROJECT_ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
SERVICE="${1:-backend}"

docker compose \
  --env-file "$ENV_FILE" \
  -f compose.production.yaml \
  logs -f \
  --tail=200 \
  "$SERVICE"
