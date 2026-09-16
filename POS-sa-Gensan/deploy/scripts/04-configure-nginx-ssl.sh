#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="/etc/gensanpos/gensanpos.env"
# shellcheck disable=SC1090
source "${ENV_FILE}"

DOMAIN="${GENSANPOS_DOMAIN:-${GENSANPOS_PUBLIC_HOST:-}}"
if [[ -z "${DOMAIN}" || "${DOMAIN}" == "pos.yourdomain.com" ]]; then
  echo "Set GENSANPOS_DOMAIN (your DNS name) in ${ENV_FILE}"
  exit 1
fi
if [[ "${DOMAIN}" =~ ^[0-9.]+$ ]]; then
  echo "Use 04-configure-nginx-ip.sh for IP-only staging, not certbot."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF="/etc/nginx/sites-available/gensanpos"

# Phase 1: HTTP only (so nginx -t passes before certs exist)
sed "s/__DOMAIN__/${DOMAIN}/g" "${SCRIPT_DIR}/../nginx/gensanpos-http-only.conf.template" > "${CONF}"
ln -sf "${CONF}" /etc/nginx/sites-enabled/gensanpos
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "==> Let's Encrypt"
certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --register-unsafely-without-email \
  --redirect || certbot --nginx -d "${DOMAIN}"

# Phase 2: full hardened config (cert paths now exist)
sed "s/__DOMAIN__/${DOMAIN}/g" "${SCRIPT_DIR}/../nginx/gensanpos.conf.template" > "${CONF}"
nginx -t && systemctl reload nginx

systemctl enable certbot.timer
echo "Live at: https://${DOMAIN}"
