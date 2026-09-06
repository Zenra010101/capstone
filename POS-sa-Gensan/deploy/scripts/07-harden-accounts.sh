#!/usr/bin/env bash
# Set owner password and disable demo defaults. Run on server after first deploy.
set -euo pipefail

ENV_FILE="/etc/gensanpos/gensanpos.env"
API_DLL="/var/www/gensanpos/api/GensanPOS.API.dll"

if [[ ! -f "${API_DLL}" ]]; then
  echo "Deploy the app first (03-deploy-release.sh)"
  exit 1
fi

read -r -s -p "New owner password (owner@gensanpos.com): " OWNER_PASS
echo
read -r -s -p "Confirm: " OWNER_PASS2
echo
if [[ "${OWNER_PASS}" != "${OWNER_PASS2}" ]] || [[ ${#OWNER_PASS} -lt 10 ]]; then
  echo "Passwords must match and be at least 10 characters."
  exit 1
fi

# systemd loads env file (do not bash-source — semicolons break connection string)
sudo -u www-data dotnet "${API_DLL}" admin set-password --email owner@gensanpos.com --password "${OWNER_PASS}"

read -r -p "Disable default cashier demo account? [y/N] " DISABLE_CASHIER
if [[ "${DISABLE_CASHIER,,}" == "y" ]]; then
  read -r -s -p "Cashier password (cashier@gensanpos.com) or leave empty to deactivate only: " CASHIER_PASS
  echo
  if [[ -n "${CASHIER_PASS}" ]]; then
    sudo -u www-data dotnet "${API_DLL}" admin set-password --email cashier@gensanpos.com --password "${CASHIER_PASS}"
  else
    sudo -u www-data dotnet "${API_DLL}" admin disable-demo-users
  fi
fi

if grep -q '^Seed__BootstrapDemoAccounts=true' "${ENV_FILE}"; then
  sed -i 's/^Seed__BootstrapDemoAccounts=true/Seed__BootstrapDemoAccounts=false/' "${ENV_FILE}"
  echo "Set Seed__BootstrapDemoAccounts=false"
  systemctl restart gensanpos-api
fi

echo "Done. Sign in at http://$(grep GENSANPOS_PUBLIC_HOST "${ENV_FILE}" | cut -d= -f2)/ with your new owner password."
