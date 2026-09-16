#!/usr/bin/env bash
# Phase 1 deploy on droplet - flag OFF. Run as root after tarball is in /tmp.
set -eu

STAMP="$(date +%Y%m%d-%H%M%S)"
ENV_FILE="/etc/gensanpos/gensanpos.env"
TARBALL="/tmp/gensanpos-release.tar.gz"

echo "==> Pre-deploy DB backup"
set -a
# shellcheck source=/dev/null
source "${ENV_FILE}"
set +a
install -d -m 750 /var/backups/gensanpos
OUT="/var/backups/gensanpos/gensanpos-pre-phase1-${STAMP}.dump"
TMP_OUT="/tmp/gensanpos-pre-phase1-${STAMP}.dump"
sudo -u postgres pg_dump -Fc -d gensanpos -f "${TMP_OUT}"
mv "${TMP_OUT}" "${OUT}"
chmod 640 "${OUT}"
echo "Backup: ${OUT}"

echo "==> API/web snapshots"
mkdir -p /var/backups/gensanpos/releases
tar -czf "/var/backups/gensanpos/releases/api-before-phase1-${STAMP}.tar.gz" -C /var/www/gensanpos api
tar -czf "/var/backups/gensanpos/releases/web-before-phase1-${STAMP}.tar.gz" -C /var/www/gensanpos web

echo "==> Ensure Phase1 flag OFF"
if ! grep -q 'ExchangeWorkflow__Phase1Enabled' "${ENV_FILE}"; then
  echo 'ExchangeWorkflow__Phase1Enabled=false' >> "${ENV_FILE}"
fi
sed -i 's/ExchangeWorkflow__Phase1Enabled=true/ExchangeWorkflow__Phase1Enabled=false/' "${ENV_FILE}"
grep 'ExchangeWorkflow__Phase1Enabled' "${ENV_FILE}" || true

echo "==> Deploy release from tarball (EF migration on API start)"
if [[ ! -f "${TARBALL}" ]]; then
  echo "ERROR: Missing ${TARBALL} - upload gensanpos-release.tar.gz first"
  exit 1
fi
TMP="$(mktemp -d)"
tar -xzf "${TARBALL}" -C "${TMP}"
RELEASE="${TMP}/gensanpos-release"
install -d -o www-data -g www-data /var/www/gensanpos/api /var/www/gensanpos/web
echo "    API..."
rsync -a --delete "${RELEASE}/api/" /var/www/gensanpos/api/
ln -sfn /var/lib/gensanpos/uploads /var/www/gensanpos/api/uploads
echo "    Web..."
rsync -a --delete "${RELEASE}/web/" /var/www/gensanpos/web/
chown -R www-data:www-data /var/www/gensanpos /var/lib/gensanpos/uploads
if systemctl list-unit-files gensanpos-api.service >/dev/null 2>&1; then
  systemctl daemon-reload
  systemctl enable gensanpos-api gensanpos-web
  systemctl restart gensanpos-api gensanpos-web
else
  echo "WARN: gensanpos systemd units missing - install deploy/systemd on server first"
fi
rm -rf "${TMP}"
sleep 3

echo "==> Health"
if curl -sf http://127.0.0.1:5170/health; then
  echo " API OK"
else
  echo " API health FAILED"
fi

echo "==> Migrations"
sudo -u postgres psql -d gensanpos -c 'SELECT "MigrationId" FROM "__EFMigrationsHistory" ORDER BY "MigrationId";'

echo ""
echo "Done. Run legacy GRS smoke tests (flag OFF). See docs/DEPLOY-PHASE1-PRODUCTION.md section 7."
