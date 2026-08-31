#!/usr/bin/env sh

set -eu

load_secret() {
  variable_name="$1"
  file_variable_name="${variable_name}_FILE"

  eval "file_path=\${${file_variable_name}:-}"

  if [ -n "${file_path}" ]; then
    if [ ! -f "${file_path}" ]; then
      echo "Secret file does not exist: ${file_path}" >&2
      exit 1
    fi

    secret_value="$(cat "${file_path}")"
    export "${variable_name}=${secret_value}"
  fi
}

load_secret "DB_PASSWORD"
load_secret "REDIS_PASSWORD"
load_secret "MEDIA_ACCESS_KEY"
load_secret "MEDIA_SECRET_KEY"

exec java ${JAVA_OPTS:-} -jar application.jar
