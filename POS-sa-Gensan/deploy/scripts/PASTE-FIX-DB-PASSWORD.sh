#!/usr/bin/env bash
# Fix: password authentication failed for user "gensanpos"
# Syncs PostgreSQL password with /etc/gensanpos/gensanpos.env
set -euo pipefail

ENV_FILE="/etc/gensanpos/gensanpos.env"
[[ -f "${ENV_FILE}" ]] || { echo "Missing ${ENV_FILE}"; exit 1; }

# shellcheck disable=SC1091
source "${ENV_FILE}"

CONN="${ConnectionStrings__DefaultConnection:-}"
DB_PASS="$(echo "${CONN}" | sed -n 's/.*Password=\([^;]*\).*/\1/p')"

if [[ -z "${DB_PASS}" ]]; then
  echo "Could not read Password= from ConnectionStrings__DefaultConnection"
  exit 1
fi

# Escape single quotes for SQL
DB_PASS_SQL="${DB_PASS//\'/\'\'\'}"

echo "==> Sync PostgreSQL password for role gensanpos"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER ROLE gensanpos WITH PASSWORD '${DB_PASS_SQL}';"

echo "==> Test connection"
export PGHOST=127.0.0.1 PGPORT=5432 PGDATABASE=gensanpos PGUSER=gensanpos PGPASSWORD="${DB_PASS}"
psql -c "SELECT 1 AS ok;" && echo "DB connection OK"

echo "==> Restart API"
systemctl restart gensanpos-api
sleep 8

if curl -sf http://127.0.0.1:5170/health >/dev/null; then
  echo "API health OK"
  curl -sf -X POST http://127.0.0.1/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"owner@gensanpos.com","password":"Owner@123"}' | head -c 150
  echo ""
  echo ""
  echo "DONE — login at http://157.245.144.237/login"
else
  echo "API still down — logs:"
  journalctl -u gensanpos-api -n 25 --no-pager
  exit 1
fi
