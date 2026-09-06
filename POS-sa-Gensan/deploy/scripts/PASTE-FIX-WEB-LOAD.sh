#!/usr/bin/env bash
# Fix: browser shows "This page couldn't load" on /pos (web service / systemd).
# Paste entire file in DigitalOcean web console as root.
set -euo pipefail

echo "==> Service status"
systemctl status gensanpos-web gensanpos-api nginx --no-pager || true

echo ""
echo "==> Recent web logs"
journalctl -u gensanpos-web -n 50 --no-pager || true

echo ""
echo "==> Relax web systemd (ProtectSystem=strict can break Next.js on 1GB droplets)"
cat > /etc/systemd/system/gensanpos-web.service <<'UNIT'
[Unit]
Description=GensanPOS Web (Next.js standalone)
After=network.target gensanpos-api.service
Wants=gensanpos-api.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/gensanpos/web
EnvironmentFile=/etc/gensanpos/gensanpos.env
ExecStart=/usr/bin/node /var/www/gensanpos/web/server.js
Restart=always
RestartSec=5
KillSignal=SIGINT
TimeoutStopSec=30
MemoryMax=350M
MemoryHigh=320M
Environment=NODE_OPTIONS=--max-old-space-size=256
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=/var/www/gensanpos/web

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl restart gensanpos-web
sleep 3

echo ""
echo "==> Local checks"
curl -sf http://127.0.0.1:5170/health && echo ""
curl -sf -o /dev/null -w "Web /login: %{http_code}\n" http://127.0.0.1:3000/login
curl -sf -o /dev/null -w "Web /pos: %{http_code}\n" http://127.0.0.1:3000/pos

echo ""
echo "DONE — in browser use exactly:"
echo "  http://157.245.144.237/login"
echo "Log in, then open POS from the menu. Hard refresh: Ctrl+Shift+R"
