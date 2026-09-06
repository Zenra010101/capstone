#!/usr/bin/env bash
# Daily backup: install to /usr/local/bin/gensanpos-backup
set -euo pipefail

ENV_FILE="/etc/gensanpos/gensanpos.env"
BACKUP_DIR="/var/backups/gensanpos"
KEEP_DAYS=14

CONN="$(grep '^ConnectionStrings__DefaultConnection=' "${ENV_FILE}" | sed 's/^[^=]*=//' | tr -d '"')"
parse_conn() {
  echo "${CONN}" | sed -n "s/.*${1}=\([^;]*\).*/\1/p"
}

PGHOST="$(parse_conn Host)"
PGPORT="$(parse_conn Port)"
PGDATABASE="$(parse_conn Database)"
PGUSER="$(parse_conn Username)"
PGPASSWORD="$(parse_conn Password)"

PGHOST="${PGHOST:-127.0.0.1}"
PGPORT="${PGPORT:-5432}"

if [[ -z "${PGDATABASE}" || -z "${PGUSER}" || -z "${PGPASSWORD}" ]]; then
  echo "Invalid ConnectionStrings__DefaultConnection in ${ENV_FILE}"
  exit 1
fi

export PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD

install -d -m 750 "${BACKUP_DIR}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${BACKUP_DIR}/gensanpos-${STAMP}.dump"

pg_dump -Fc -f "${OUT}"
chmod 640 "${OUT}"

find "${BACKUP_DIR}" -name 'gensanpos-*.dump' -mtime +"${KEEP_DAYS}" -delete
echo "Backup: ${OUT}"
