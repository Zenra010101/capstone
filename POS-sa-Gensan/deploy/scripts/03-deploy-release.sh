#!/usr/bin/env bash
# Deploy pre-built release tarball from build-release.sh
# Usage (on server as root):
#   bash 03-deploy-release.sh /tmp/gensanpos-release.tar.gz
set -euo pipefail

TARBALL="${1:-/tmp/gensanpos-release.tar.gz}"
ENV_FILE="/etc/gensanpos/gensanpos.env"

if [[ ! -f "${TARBALL}" ]]; then
  echo "Usage: $0 /path/to/gensanpos-release.tar.gz"
  exit 1
fi
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}"
  exit 1
fi

echo "==> Extract release"
TMP="$(mktemp -d)"
tar -xzf "${TARBALL}" -C "${TMP}"
ROOT="${TMP}/gensanpos-release"

install -d -o www-data -g www-data /var/www/gensanpos/api /var/www/gensanpos/web

echo "==> API"
rsync -a --delete "${ROOT}/api/" /var/www/gensanpos/api/
ln -sfn /var/lib/gensanpos/uploads /var/www/gensanpos/api/uploads

echo "==> Web (Next.js standalone)"
rsync -a --delete "${ROOT}/web/" /var/www/gensanpos/web/

chown -R www-data:www-data /var/www/gensanpos /var/lib/gensanpos/uploads

echo "==> systemd"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp "${SCRIPT_DIR}/../systemd/"*.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable gensanpos-api gensanpos-web
systemctl restart gensanpos-api gensanpos-web

echo "==> Waiting for API to finish startup (EF migrations can take a while)..."
API_OK=0
for i in $(seq 1 30); do
  if curl -sf -o /dev/null http://127.0.0.1:5170/health; then
    API_OK=1
    echo " API health OK after ${i}s"
    break
  fi
  sleep 1
done
if [[ "${API_OK}" -ne 1 ]]; then
  echo " API health FAILED after 30s — recent logs:"
  journalctl -u gensanpos-api -n 40 --no-pager || true
fi

systemctl --no-pager status gensanpos-api gensanpos-web || true
curl -sf -o /dev/null -w " Web HTTP %{http_code}\n" http://127.0.0.1:3000/ || true

echo "Deploy complete."
echo "  EF migrations run on API start (PostgreSQL)."
echo "  Next: bash deploy/scripts/04-configure-nginx-ip.sh"
echo "  Then: bash deploy/scripts/07-harden-accounts.sh"
