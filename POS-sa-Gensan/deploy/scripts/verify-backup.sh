#!/usr/bin/env bash
# Verify PostgreSQL backups for GensanPOS (read-only checks).
#
# Usage:
#   sudo bash verify-backup.sh              # verify latest dump
#   sudo bash verify-backup.sh --create     # run fresh backup first, then verify
#   sudo bash verify-backup.sh --restore-test  # also restore into gensanpos_verify

set -euo pipefail

BACKUP_DIR="${GENSANPOS_BACKUP_DIR:-/var/backups/gensanpos}"
CREATE=0
RESTORE_TEST=0

for arg in "$@"; do
  case "${arg}" in
    --create) CREATE=1 ;;
    --restore-test) RESTORE_TEST=1 ;;
    -h|--help)
      echo "Usage: $0 [--create] [--restore-test]"
      exit 0
      ;;
    *)
      echo "Unknown option: ${arg}"
      exit 1
      ;;
  esac
done

if [[ "${CREATE}" -eq 1 ]]; then
  if [[ ! -x /usr/local/bin/gensanpos-backup ]]; then
    echo "ERROR: /usr/local/bin/gensanpos-backup not found. Install via 05-install-backup-cron.sh"
    exit 1
  fi
  echo "==> Creating fresh backup"
  /usr/local/bin/gensanpos-backup
fi

install -d -m 750 "${BACKUP_DIR}"
LATEST="$(ls -t "${BACKUP_DIR}"/gensanpos-*.dump 2>/dev/null | head -1 || true)"

if [[ -z "${LATEST}" ]]; then
  echo "ERROR: No backup dumps found in ${BACKUP_DIR}"
  echo "Run: sudo /usr/local/bin/gensanpos-backup"
  exit 1
fi

echo "==> Latest backup file"
ls -lh "${LATEST}"

echo ""
echo "==> Verifying dump integrity (pg_restore -l)"
TABLE_COUNT="$(pg_restore -l "${LATEST}" | grep -c 'TABLE DATA' || true)"
echo "    TABLE DATA entries: ${TABLE_COUNT}"
if [[ "${TABLE_COUNT}" -lt 10 ]]; then
  echo "ERROR: Dump looks incomplete (expected many TABLE DATA entries)"
  exit 1
fi
pg_restore -l "${LATEST}" | head -15
echo "    ..."

if [[ "${RESTORE_TEST}" -eq 1 ]]; then
  echo ""
  echo "==> Restore test into temporary database gensanpos_verify"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS gensanpos_verify;"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE gensanpos_verify OWNER gensanpos;"
  sudo -u postgres pg_restore -d gensanpos_verify "${LATEST}"
  sudo -u postgres psql -d gensanpos_verify -v ON_ERROR_STOP=1 -c \
    'SELECT '\''Products'\'' AS metric, COUNT(*)::bigint AS count FROM "Products"
     UNION ALL SELECT '\''Active products'\'', COUNT(*)::bigint FROM "Products" WHERE "IsActive" = TRUE
     UNION ALL SELECT '\''Sales'\'', COUNT(*)::bigint FROM "Sales";'
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "DROP DATABASE gensanpos_verify;"
  echo "    Restore test OK (gensanpos_verify dropped)"
fi

echo ""
echo "BACKUP VERIFIED: ${LATEST}"
