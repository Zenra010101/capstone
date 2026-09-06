#!/usr/bin/env bash
# Reset DB password (fixes bash "source" breaking on semicolons in connection string).
set -euo pipefail

ENV_FILE="/etc/gensanpos/gensanpos.env"
NEW_PASS="$(openssl rand -hex 20)"

echo "==> New DB password (saved to ${ENV_FILE})"
CONN="Host=127.0.0.1;Port=5432;Database=gensanpos;Username=gensanpos;Password=${NEW_PASS}"

if grep -q '^ConnectionStrings__DefaultConnection=' "${ENV_FILE}"; then
  sed -i "/^ConnectionStrings__DefaultConnection=/d" "${ENV_FILE}"
fi
echo "ConnectionStrings__DefaultConnection=\"${CONN}\"" >> "${ENV_FILE}"

echo "==> PostgreSQL role + database"
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'gensanpos') THEN
    CREATE ROLE gensanpos LOGIN PASSWORD '${NEW_PASS}';
  ELSE
    ALTER ROLE gensanpos WITH PASSWORD '${NEW_PASS}';
  END IF;
END
\$\$;
SQL

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='gensanpos'" | grep -q 1; then
  sudo -u postgres createdb -O gensanpos gensanpos
fi

echo "==> Test DB login"
export PGHOST=127.0.0.1 PGPORT=5432 PGDATABASE=gensanpos PGUSER=gensanpos PGPASSWORD="${NEW_PASS}"
psql -c "SELECT 1 AS ok;"

echo "==> Restart API"
systemctl restart gensanpos-api
sleep 10

curl -sf http://127.0.0.1:5170/health && echo " API OK" || {
  journalctl -u gensanpos-api -n 30 --no-pager
  exit 1
}

echo ""
echo "DONE — http://157.245.144.237/login"
echo "Login: owner@gensanpos.com / Owner@123"
