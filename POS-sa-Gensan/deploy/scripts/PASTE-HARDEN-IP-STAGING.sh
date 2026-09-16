#!/usr/bin/env bash
# ============================================================
# GensanPOS - IP-only staging hardening and verification
# Paste/run this on the DigitalOcean droplet as root.
#
# Safe defaults:
# - Does NOT delete existing backups
# - Does NOT expose PostgreSQL publicly
# - Does NOT configure HTTPS/certbot
# - Keeps production environment
# ============================================================
set -euo pipefail

PUBLIC_IP="${PUBLIC_IP:-157.245.144.237}"
ROOT="${GENSANPOS_ROOT:-/opt/gensanpos}"
ENV_FILE="/etc/gensanpos/gensanpos.env"
API_DLL="/var/www/gensanpos/api/GensanPOS.API.dll"

if [[ "${EUID:-0}" -ne 0 ]]; then
  echo "Run as root."
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Deploy the app first."
  exit 1
fi

if [[ ! -f "${API_DLL}" ]]; then
  echo "Missing ${API_DLL}. Deploy the app first."
  exit 1
fi

echo "========== GensanPOS IP staging hardening =========="
echo "Public URL: http://${PUBLIC_IP}/"

echo "==> [1/8] Lock production environment file"
cp -a "${ENV_FILE}" "${ENV_FILE}.bak.$(date +%Y%m%d-%H%M%S)"

set_env() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "${ENV_FILE}"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "${ENV_FILE}"
  else
    printf '%s=%s\n' "${key}" "${value}" >> "${ENV_FILE}"
  fi
}

set_env "GENSANPOS_PUBLIC_HOST" "${PUBLIC_IP}"
set_env "GENSANPOS_DOMAIN" "${PUBLIC_IP}"
set_env "Cors__AllowedOrigins__0" "http://${PUBLIC_IP}"
set_env "ASPNETCORE_ENVIRONMENT" "Production"
set_env "ASPNETCORE_URLS" "http://127.0.0.1:5170"
set_env "HOSTNAME" "127.0.0.1"
set_env "PORT" "3000"
set_env "NODE_ENV" "production"
set_env "NEXT_PUBLIC_API_URL" ""
set_env "Seed__IncludeSampleProducts" "false"

chown root:root "${ENV_FILE}"
chmod 600 "${ENV_FILE}"

echo "==> [2/8] Rotate default owner password"
read -r -p "Change owner password now? [Y/n] " CHANGE_OWNER
CHANGE_OWNER="${CHANGE_OWNER:-Y}"
if [[ "${CHANGE_OWNER,,}" == "y" ]]; then
  read -r -s -p "New owner password (owner@gensanpos.com): " OWNER_PASS
  echo
  read -r -s -p "Confirm owner password: " OWNER_PASS2
  echo
  if [[ "${OWNER_PASS}" != "${OWNER_PASS2}" || ${#OWNER_PASS} -lt 10 ]]; then
    echo "Passwords must match and be at least 10 characters."
    exit 1
  fi
  sudo -u www-data dotnet "${API_DLL}" admin set-password --email owner@gensanpos.com --password "${OWNER_PASS}"
fi

read -r -p "Disable demo bootstrap seeding? [Y/n] " DISABLE_SEED
DISABLE_SEED="${DISABLE_SEED:-Y}"
if [[ "${DISABLE_SEED,,}" == "y" ]]; then
  set_env "Seed__BootstrapDemoAccounts" "false"
fi

read -r -p "Disable default cashier demo account? [y/N] " DISABLE_CASHIER
DISABLE_CASHIER="${DISABLE_CASHIER:-N}"
if [[ "${DISABLE_CASHIER,,}" == "y" ]]; then
  sudo -u www-data dotnet "${API_DLL}" admin disable-demo-users
fi

echo "==> [3/8] Keep PostgreSQL localhost-only and tuned for 1GB"
PG_VER="$(ls /etc/postgresql 2>/dev/null | head -1 || true)"
if [[ -n "${PG_VER}" ]]; then
  install -m 644 /dev/stdin "/etc/postgresql/${PG_VER}/main/conf.d/99-gensanpos.conf" <<'PGTUNE'
listen_addresses = 'localhost'
max_connections = 30
shared_buffers = 128MB
effective_cache_size = 256MB
maintenance_work_mem = 64MB
work_mem = 4MB
wal_buffers = 4MB
checkpoint_completion_target = 0.9
random_page_cost = 1.1
effective_io_concurrency = 200
log_min_duration_statement = 1000
PGTUNE
  systemctl restart postgresql
else
  echo "WARN: PostgreSQL config directory not found."
fi

echo "==> [4/8] Re-apply IP-only Nginx reverse proxy"
if [[ -x "${ROOT}/deploy/scripts/04-configure-nginx-ip.sh" ]]; then
  bash "${ROOT}/deploy/scripts/04-configure-nginx-ip.sh"
else
  echo "WARN: ${ROOT}/deploy/scripts/04-configure-nginx-ip.sh not found."
fi

echo "==> [5/8] Firewall: only SSH + HTTP/HTTPS web traffic"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "==> [6/8] Backup cron and backup verification"
if [[ -x "${ROOT}/deploy/scripts/05-install-backup-cron.sh" ]]; then
  bash "${ROOT}/deploy/scripts/05-install-backup-cron.sh"
fi

if command -v gensanpos-backup >/dev/null 2>&1; then
  /usr/local/bin/gensanpos-backup
  LATEST="$(ls -t /var/backups/gensanpos/gensanpos-*.dump 2>/dev/null | head -1 || true)"
  if [[ -n "${LATEST}" ]]; then
    echo "Latest backup: ${LATEST}"
    pg_restore -l "${LATEST}" >/dev/null
    echo "Backup catalog readable: OK"
  else
    echo "WARN: No backup dump found after backup run."
  fi
else
  echo "WARN: gensanpos-backup command not installed."
fi

echo "==> [7/8] Restart app services"
systemctl daemon-reload
systemctl restart gensanpos-api gensanpos-web nginx

echo "==> [8/8] Health and security checks"
curl -sf "http://127.0.0.1:5170/health" && echo " API local OK"
curl -sf "http://${PUBLIC_IP}/health" && echo " Public health OK"

echo ""
echo "Listening ports:"
ss -tulpn | grep -E '(:80|:443|:5170|:3000|:5432)' || true

echo ""
echo "Service status:"
systemctl --no-pager --full status gensanpos-api gensanpos-web nginx postgresql | sed -n '1,80p'

echo ""
echo "Backups:"
ls -lh /var/backups/gensanpos/ 2>/dev/null | tail -10 || true

echo ""
echo "Done. Test here: http://${PUBLIC_IP}/"
echo "Reminder: HTTPS requires a real domain later; keep using http://${PUBLIC_IP}/ for IP-only testing."
