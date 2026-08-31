#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(
  cd "$(dirname "${BASH_SOURCE[0]}")/../.."
  pwd
)"

"$PROJECT_ROOT/infrastructure/scripts/backup-postgres.sh"
"$PROJECT_ROOT/infrastructure/scripts/backup-minio.sh"

echo "All application backups completed."
