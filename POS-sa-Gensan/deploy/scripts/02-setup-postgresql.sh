#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-/etc/gensanpos/gensanpos.env}"
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Copy deploy/env/gensanpos.env.example first."
  exit 1
fi

CONN="$(grep '^ConnectionStrings__DefaultConnection=' "${ENV_FILE}" | sed 's/^[^=]*=//' | tr -d '"')"
DB_PASS="$(echo "${CONN}" | sed -n 's/.*Password=\([^;]*\).*/\1/p')"
if [[ -z "${DB_PASS}" || "${DB_PASS}" == "CHANGE_ME_STRONG_PASSWORD" ]]; then
  echo "Set a strong Password= in ConnectionStrings__DefaultConnection"
  exit 1
fi

DB_USER="gensanpos"
DB_NAME="gensanpos"

sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';
  ELSE
    ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;
SQL

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"
fi

echo "PostgreSQL ready: ${DB_NAME} / ${DB_USER} (127.0.0.1 only)"
