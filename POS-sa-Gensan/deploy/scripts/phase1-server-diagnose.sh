#!/usr/bin/env bash
# Quick API failure diagnosis on droplet (run as root)
set -eu

echo "==> Services"
systemctl is-active gensanpos-api gensanpos-web postgresql nginx || true
systemctl status gensanpos-api --no-pager -l || true

echo ""
echo "==> Last API logs"
journalctl -u gensanpos-api -n 60 --no-pager || true

echo ""
echo "==> Health curl"
curl -sv http://127.0.0.1:5170/health 2>&1 | tail -20 || true

echo ""
echo "==> Migrations table"
sudo -u postgres psql -d gensanpos -t -c 'SELECT "MigrationId" FROM "__EFMigrationsHistory" ORDER BY "MigrationId";' 2>/dev/null || true

echo ""
echo "==> Phase1 flag"
grep ExchangeWorkflow /etc/gensanpos/gensanpos.env || true
