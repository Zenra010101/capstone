#!/usr/bin/env bash
# Wipe transactional data only - no TEST-OPENING seed. Use before go-live OPENING batches or Stock Receiving.
#
# Usage:
#   sudo bash reset-inventory-go-live-wipe.sh dry-run
#   sudo bash reset-inventory-go-live-wipe.sh execute

set -euo pipefail

MODE="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${GENSANPOS_ENV_FILE:-/etc/gensanpos/gensanpos.env}"

if [[ "${MODE}" != "dry-run" && "${MODE}" != "execute" ]]; then
  echo "Usage: $0 dry-run|execute"
  exit 1
fi

if [[ "${MODE}" == "dry-run" ]]; then
  exec bash "${SCRIPT_DIR}/reset-inventory-test-baseline.sh" dry-run
fi

CONN="$(grep '^ConnectionStrings__DefaultConnection=' "${ENV_FILE}" | sed 's/^[^=]*=//' | tr -d '"')"
parse_conn() { echo "${CONN}" | sed -n "s/.*${1}=\([^;]*\).*/\1/p"; }
export PGHOST="$(parse_conn Host)" PGPORT="$(parse_conn Port)" PGDATABASE="$(parse_conn Database)"
export PGUSER="$(parse_conn Username)" PGPASSWORD="$(parse_conn Password)"
PGHOST="${PGHOST:-127.0.0.1}"
PGPORT="${PGPORT:-5432}"

echo "==> GO-LIVE WIPE - transactional data only (no stock seed)"
read -r -p "Type RESET-GOLIVE to continue: " CONFIRM
[[ "${CONFIRM}" == "RESET-GOLIVE" ]] || { echo "Aborted."; exit 1; }

BACKUP_DIR="${GENSANPOS_BACKUP_DIR:-/var/backups/gensanpos}"
install -d -m 750 "${BACKUP_DIR}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_PATH="${BACKUP_DIR}/gensanpos-pre-golive-wipe-${STAMP}.dump"
pg_dump -Fc -f "${BACKUP_PATH}"
chmod 640 "${BACKUP_PATH}"
echo "Backup: ${BACKUP_PATH}"

API_WAS_ACTIVE=0
if systemctl is-active --quiet gensanpos-api 2>/dev/null; then
  API_WAS_ACTIVE=1
  systemctl stop gensanpos-api
fi
trap '[[ $API_WAS_ACTIVE -eq 1 ]] && systemctl start gensanpos-api || true' EXIT

psql -v ON_ERROR_STOP=1 <<SQL
BEGIN;
\\i ${SCRIPT_DIR}/reset-inventory-wipe-transactional.sql
COMMIT;
SQL

echo "DONE - load real inventory via OPENING batches or Stock Receiving."
