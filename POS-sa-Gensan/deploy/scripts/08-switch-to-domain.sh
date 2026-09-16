#!/usr/bin/env bash
# After you buy a domain: point DNS A record to droplet, then run:
#   sudo bash 08-switch-to-domain.sh pos.yourshop.com
set -euo pipefail

DOMAIN="${1:-}"
if [[ -z "${DOMAIN}" ]]; then
  echo "Usage: sudo bash $0 pos.yourshop.com"
  exit 1
fi

ENV_FILE="/etc/gensanpos/gensanpos.env"
# shellcheck disable=SC1090
source "${ENV_FILE}" 2>/dev/null || true

sed -i "s|^GENSANPOS_PUBLIC_HOST=.*|GENSANPOS_PUBLIC_HOST=${DOMAIN}|" "${ENV_FILE}"
sed -i "s|^GENSANPOS_DOMAIN=.*|GENSANPOS_DOMAIN=${DOMAIN}|" "${ENV_FILE}"
sed -i "s|^Cors__AllowedOrigins__0=.*|Cors__AllowedOrigins__0=https://${DOMAIN}|" "${ENV_FILE}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "${SCRIPT_DIR}/04-configure-nginx-ssl.sh"

systemctl restart gensanpos-api gensanpos-web
echo "Updated for https://${DOMAIN}"
