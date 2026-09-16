#!/usr/bin/env bash
# Generate /etc/gensanpos/gensanpos.env with strong secrets.
# Usage: sudo bash 00-generate-env.sh [PUBLIC_IP]
set -euo pipefail

PUBLIC_HOST="${1:-157.245.144.237}"
ENV_FILE="/etc/gensanpos/gensanpos.env"

if [[ "${EUID:-0}" -ne 0 ]]; then
  echo "Run as root: sudo bash $0 ${PUBLIC_HOST}"
  exit 1
fi

install -d -m 750 /etc/gensanpos

DB_PASS="$(openssl rand -hex 20)"
JWT_SECRET="$(openssl rand -base64 48 | tr -d '\n')"

cat > "${ENV_FILE}" <<EOF
# Generated $(date -u +%Y-%m-%dT%H:%MZ) — IP staging
GENSANPOS_PUBLIC_HOST=${PUBLIC_HOST}
GENSANPOS_DOMAIN=${PUBLIC_HOST}
Cors__AllowedOrigins__0=http://${PUBLIC_HOST}

ConnectionStrings__DefaultConnection="Host=127.0.0.1;Port=5432;Database=gensanpos;Username=gensanpos;Password=${DB_PASS}"

Jwt__Secret=${JWT_SECRET}
Jwt__Issuer=GensanPOS
Jwt__Audience=GensanPOS
Jwt__ExpirationHours=8

ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://127.0.0.1:5170

PORT=3000
HOSTNAME=127.0.0.1
NODE_ENV=production
NEXT_PUBLIC_API_URL=

Seed__IncludeSampleProducts=false
Seed__BootstrapDemoAccounts=true
EOF

chmod 600 "${ENV_FILE}"
echo "Wrote ${ENV_FILE}"
echo "CORS origin: http://${PUBLIC_HOST}"
echo "After first login, run: bash deploy/scripts/07-harden-accounts.sh"
