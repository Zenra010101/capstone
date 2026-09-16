#!/usr/bin/env bash
# Deploy tarball only (skip backup). Flag must already be OFF in gensanpos.env.
set -eu

ENV_FILE="/etc/gensanpos/gensanpos.env"
TARBALL="/tmp/gensanpos-release.tar.gz"

grep 'ExchangeWorkflow__Phase1Enabled=false' "${ENV_FILE}" || {
  echo "ERROR: Set ExchangeWorkflow__Phase1Enabled=false in ${ENV_FILE}"
  exit 1
}

if [[ ! -f "${TARBALL}" ]]; then
  echo "ERROR: Missing ${TARBALL}"
  exit 1
fi

echo "==> Tarball on server: $(ls -lh "${TARBALL}")"

echo "==> Deploy release from tarball"
TMP="$(mktemp -d)"
tar -xzf "${TARBALL}" -C "${TMP}"
RELEASE="${TMP}/gensanpos-release"
install -d -o www-data -g www-data /var/www/gensanpos/api /var/www/gensanpos/web
rsync -a --delete "${RELEASE}/api/" /var/www/gensanpos/api/
ln -sfn /var/lib/gensanpos/uploads /var/www/gensanpos/api/uploads
rsync -a --delete "${RELEASE}/web/" /var/www/gensanpos/web/
chown -R www-data:www-data /var/www/gensanpos /var/lib/gensanpos/uploads
systemctl daemon-reload
systemctl restart gensanpos-api gensanpos-web
rm -rf "${TMP}"

echo "==> Waiting for API (migrations on start)..."
ok=0
for i in 1 2 3 4 5 6 7 8 9 10; do
  sleep 3
  if curl -sf http://127.0.0.1:5170/health >/dev/null; then
    ok=1
    break
  fi
  echo "    attempt ${i}/10..."
done

if [[ "${ok}" -eq 1 ]]; then
  echo " API OK"
else
  echo " API health FAILED"
  systemctl status gensanpos-api --no-pager -l || true
  journalctl -u gensanpos-api -n 40 --no-pager || true
  exit 1
fi

echo "==> Migrations"
sudo -u postgres psql -d gensanpos -c 'SELECT "MigrationId" FROM "__EFMigrationsHistory" ORDER BY "MigrationId";'

echo "Deploy complete. Run legacy GRS smoke tests."
