#!/usr/bin/env bash
# Import a product catalog CSV/XLSX into PostgreSQL (production).
# Do NOT bash-source /etc/gensanpos/gensanpos.env — semicolons in the connection string break export.
#
# Usage (on server as root):
#   bash /opt/gensanpos/deploy/scripts/import-catalog.sh /path/to/accessories-catalog.csv --no-archive
set -euo pipefail

ENV_FILE="/etc/gensanpos/gensanpos.env"
API_DLL="/var/www/gensanpos/api/GensanPOS.API.dll"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <catalog.csv|xlsx> [--no-archive] [--dry-run] [--archive-demo]"
  exit 1
fi

CATALOG_FILE="$1"
shift

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}"
  exit 1
fi
if [[ ! -f "${API_DLL}" ]]; then
  echo "Missing ${API_DLL} — deploy the API first."
  exit 1
fi
if [[ ! -f "${CATALOG_FILE}" ]]; then
  echo "Catalog file not found: ${CATALOG_FILE}"
  exit 1
fi

CONN="$(grep '^ConnectionStrings__DefaultConnection=' "${ENV_FILE}" | sed 's/^ConnectionStrings__DefaultConnection=//' | tr -d '"')"
if [[ -z "${CONN}" || "${CONN}" != Host=* ]]; then
  echo "Could not read ConnectionStrings__DefaultConnection from ${ENV_FILE}"
  exit 1
fi

ASPNET_ENV="$(grep '^ASPNETCORE_ENVIRONMENT=' "${ENV_FILE}" | sed 's/^ASPNETCORE_ENVIRONMENT=//' | tr -d '"' || true)"
ASPNET_ENV="${ASPNET_ENV:-Production}"

EXTRA_ARGS=("$@")

echo "==> Catalog import"
echo "    File: ${CATALOG_FILE}"
echo "    DB:   PostgreSQL (${CONN%%;*};...)"
echo "    Args: ${EXTRA_ARGS[*]:-<default>}"

sudo -u www-data env \
  "ConnectionStrings__DefaultConnection=${CONN}" \
  "ASPNETCORE_ENVIRONMENT=${ASPNET_ENV}" \
  dotnet "${API_DLL}" catalog-import --file "${CATALOG_FILE}" "${EXTRA_ARGS[@]}"

echo "==> Done."
