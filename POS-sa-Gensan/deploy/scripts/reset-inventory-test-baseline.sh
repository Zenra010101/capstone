#!/usr/bin/env bash
# Reset transactional inventory/sales data and seed TEST-OPENING batches (50 units per active product).
#
# Usage (on server):
#   sudo bash reset-inventory-test-baseline.sh dry-run
#   sudo bash reset-inventory-test-baseline.sh execute
#
# execute: pg_dump backup, stop API, wipe + seed in one transaction, start API

set -euo pipefail

MODE="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${GENSANPOS_ENV_FILE:-/etc/gensanpos/gensanpos.env}"

if [[ "${MODE}" != "dry-run" && "${MODE}" != "execute" ]]; then
  echo "Usage: $0 dry-run|execute"
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing env file: ${ENV_FILE}"
  exit 1
fi

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

run_psql() {
  psql -v ON_ERROR_STOP=1 "$@"
}

if [[ "${MODE}" == "dry-run" ]]; then
  echo "==> Dry-run only - no changes will be made"
  echo "    Database: ${PGDATABASE}@${PGHOST}:${PGPORT}"
  echo ""
  run_psql -f "${SCRIPT_DIR}/reset-inventory-dry-run.sql"
  exit 0
fi

echo "==> EXECUTE - this will wipe transactional data and seed TEST-OPENING batches"
echo "    Database: ${PGDATABASE}@${PGHOST}:${PGPORT}"
echo ""
read -r -p "Type RESET-TEST to continue: " CONFIRM
if [[ "${CONFIRM}" != "RESET-TEST" ]]; then
  echo "Aborted."
  exit 1
fi

BACKUP_DIR="${GENSANPOS_BACKUP_DIR:-/var/backups/gensanpos}"
install -d -m 750 "${BACKUP_DIR}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_PATH="${BACKUP_DIR}/gensanpos-pre-test-reset-${STAMP}.dump"

echo "==> Full database backup"
pg_dump -Fc -f "${BACKUP_PATH}"
chmod 640 "${BACKUP_PATH}"
echo "    Backup: ${BACKUP_PATH}"

API_WAS_ACTIVE=0
if systemctl is-active --quiet gensanpos-api 2>/dev/null; then
  API_WAS_ACTIVE=1
  echo "==> Stopping gensanpos-api"
  systemctl stop gensanpos-api
fi

cleanup_api() {
  if [[ "${API_WAS_ACTIVE}" -eq 1 ]]; then
    echo "==> Starting gensanpos-api"
    systemctl start gensanpos-api || true
  fi
}
trap cleanup_api EXIT

echo "==> Wipe + seed (single transaction)"
run_psql <<SQL
BEGIN;
\\i ${SCRIPT_DIR}/reset-inventory-wipe-transactional.sql
\\i ${SCRIPT_DIR}/reset-inventory-seed-test-opening.sql
COMMIT;
SQL

echo ""
echo "==> Post-reset verification"
run_psql <<'SQL'
SELECT 'Active products' AS metric, COUNT(*)::bigint AS count FROM "Products" WHERE "IsActive" = TRUE
UNION ALL
SELECT 'TEST-OPENING batches', COUNT(*)::bigint FROM "ProductBatches" WHERE "BatchCode" = 'TEST-OPENING'
UNION ALL
SELECT 'TEST-OPENING ledger rows', COUNT(*)::bigint FROM "InventoryTransactions" WHERE "Reference" = 'TEST-OPENING'
UNION ALL
SELECT 'Sales remaining (expect 0)', COUNT(*)::bigint FROM "Sales"
UNION ALL
SELECT 'Receivings remaining (expect 0)', COUNT(*)::bigint FROM "StockReceivings"
UNION ALL
SELECT 'Sum active product stock', COALESCE(SUM("StockQuantity"), 0)::bigint FROM "Products" WHERE "IsActive" = TRUE;
SQL

echo ""
echo "DONE - test baseline ready."
echo "Backup retained at: ${BACKUP_PATH}"
echo "After testing, run final go-live wipe - see deploy/RESET-INVENTORY.md"
