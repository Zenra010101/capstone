#!/usr/bin/env bash
# Full IP production deploy on Ubuntu 24.04 (run as root on droplet).
# Prerequisites: repo at /opt/gensanpos, tarball at /tmp/gensanpos-release.tar.gz
#
# Usage:
#   bash deploy/scripts/deploy-production-ip.sh [PUBLIC_IP] [/path/to/tarball]
#
set -euo pipefail

PUBLIC_IP="${1:-157.245.144.237}"
TARBALL="${2:-/tmp/gensanpos-release.tar.gz}"
ROOT="${GENSANPOS_ROOT:-/opt/gensanpos}"

if [[ "${EUID:-0}" -ne 0 ]]; then
  echo "Run as root: sudo bash $0"
  exit 1
fi

if [[ ! -f "${TARBALL}" ]]; then
  echo "Missing release tarball: ${TARBALL}"
  echo "Build on PC: .\\deploy\\scripts\\build-release.ps1"
  echo "Upload: scp dist/gensanpos-release.tar.gz root@${PUBLIC_IP}:/tmp/"
  exit 1
fi

if [[ ! -d "${ROOT}/deploy/scripts" ]]; then
  echo "Missing ${ROOT}/deploy — clone repo or upload deploy/ folder."
  exit 1
fi

cd "${ROOT}"
chmod +x deploy/scripts/*.sh

echo "========== 1/7 Bootstrap =========="
bash deploy/scripts/01-server-bootstrap.sh

echo "========== 2/7 Environment =========="
if [[ ! -f /etc/gensanpos/gensanpos.env ]]; then
  bash deploy/scripts/00-generate-env.sh "${PUBLIC_IP}"
else
  echo "Keeping existing /etc/gensanpos/gensanpos.env"
fi

echo "========== 3/7 PostgreSQL =========="
bash deploy/scripts/02-setup-postgresql.sh

echo "========== 4/7 Application =========="
bash deploy/scripts/03-deploy-release.sh "${TARBALL}"

echo "========== 5/7 Nginx =========="
bash deploy/scripts/04-configure-nginx-ip.sh

echo "========== 6/7 Backup cron =========="
bash deploy/scripts/05-install-backup-cron.sh
/usr/local/bin/gensanpos-backup || true

echo "========== 7/7 Health =========="
curl -sf "http://127.0.0.1:5170/health" && echo " API OK"
curl -sf -o /dev/null -w "Web HTTP %{http_code}\n" "http://127.0.0.1:3000/" || true
curl -sf "http://${PUBLIC_IP}/health" && echo " Public health OK" || echo "WARN: public health check failed"

echo ""
echo "=============================================="
echo " Deploy complete (IP staging)"
echo " URL:  http://${PUBLIC_IP}/"
echo ""
echo " REQUIRED NEXT STEP — change default passwords:"
echo "   bash ${ROOT}/deploy/scripts/07-harden-accounts.sh"
echo ""
echo " Temp logins (until hardening):"
echo "   owner@gensanpos.com / Owner@123"
echo "=============================================="
