#!/usr/bin/env bash
# Nginx HTTP reverse proxy for IP (no SSL). Run on server as root.
set -euo pipefail

ENV_FILE="/etc/gensanpos/gensanpos.env"
# shellcheck disable=SC1090
source "${ENV_FILE}"

HOST="${GENSANPOS_PUBLIC_HOST:-${GENSANPOS_DOMAIN:-157.245.144.237}}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF="/etc/nginx/sites-available/gensanpos"

sed "s/__HOST__/${HOST}/g" "${SCRIPT_DIR}/../nginx/gensanpos-ip.conf.template" > "${CONF}"
ln -sf "${CONF}" /etc/nginx/sites-enabled/gensanpos
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable nginx
systemctl reload nginx

echo "App URL: http://${HOST}/"
echo "Health:  http://${HOST}/health"
