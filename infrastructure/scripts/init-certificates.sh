#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(
  cd "$(dirname "${BASH_SOURCE[0]}")/../.."
  pwd
)"

cd "$PROJECT_ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="compose.production.yaml"

set -a
source "$ENV_FILE"
set +a

if [ -z "${APP_DOMAIN:-}" ]; then
  echo "APP_DOMAIN is required." >&2
  exit 1
fi

if [ -z "${STORAGE_DOMAIN:-}" ]; then
  echo "STORAGE_DOMAIN is required." >&2
  exit 1
fi

if [ -z "${LETSENCRYPT_EMAIL:-}" ]; then
  echo "LETSENCRYPT_EMAIL is required." >&2
  exit 1
fi

echo "Starting Nginx with HTTP bootstrap configuration..."

docker compose \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  run \
  --rm \
  --service-ports \
  -v "$PROJECT_ROOT/infrastructure/nginx/bootstrap.conf.template:/etc/nginx/templates/default.conf.template:ro" \
  nginx &

NGINX_PID=$!

sleep 8

echo "Requesting Let's Encrypt certificate..."

docker compose \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  run \
  --rm \
  certbot \
  certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$LETSENCRYPT_EMAIL" \
  --agree-tos \
  --no-eff-email \
  --cert-name "$APP_DOMAIN" \
  -d "$APP_DOMAIN" \
  -d "$STORAGE_DOMAIN"

kill "$NGINX_PID" || true

echo "Starting production Nginx with HTTPS..."

docker compose \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  up -d nginx

echo "Certificate initialization completed."
