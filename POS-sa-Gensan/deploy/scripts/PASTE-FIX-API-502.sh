#!/usr/bin/env bash
# Fix: 502 Bad Gateway — API not running. Paste in DigitalOcean console as root.
set -euo pipefail

echo "==> API service status"
systemctl status gensanpos-api --no-pager || true
echo ""
echo "==> Last API logs"
journalctl -u gensanpos-api -n 40 --no-pager || true

echo "==> Fix systemd (less restrictive for .NET)"
cat > /etc/systemd/system/gensanpos-api.service <<'UNIT'
[Unit]
Description=GensanPOS API (ASP.NET)
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/gensanpos/api
EnvironmentFile=/etc/gensanpos/gensanpos.env
ExecStart=/usr/bin/dotnet /var/www/gensanpos/api/GensanPOS.API.dll
Restart=always
RestartSec=5
MemoryMax=400M
MemoryHigh=360M
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=/var/lib/gensanpos/uploads /var/www/gensanpos/api /var/lib/gensanpos

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable gensanpos-api postgresql

echo "==> PostgreSQL"
systemctl restart postgresql
sleep 2
sudo -u postgres psql -c "SELECT 1" && echo "PG OK"

echo "==> Restart API"
systemctl restart gensanpos-api
sleep 8

if curl -sf http://127.0.0.1:5170/health >/dev/null; then
  echo "API health OK on :5170"
else
  echo "API still failing — manual test:"
  set -a
  # shellcheck disable=SC1091
  source /etc/gensanpos/gensanpos.env
  set +a
  sudo -u www-data -E dotnet /var/www/gensanpos/api/GensanPOS.API.dll &
  sleep 10
  curl -v http://127.0.0.1:5170/health || true
  pkill -f GensanPOS.API.dll || true
  journalctl -u gensanpos-api -n 20 --no-pager
  exit 1
fi

echo "==> Test login via Nginx"
curl -sf -X POST http://127.0.0.1/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@gensanpos.com","password":"Owner@123"}' | head -c 200
echo ""
systemctl reload nginx
echo ""
echo "DONE — try http://157.245.144.237/login (Ctrl+Shift+R)"
echo "If login fails, run: journalctl -u gensanpos-api -n 50 --no-pager"
