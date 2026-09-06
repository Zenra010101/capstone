#!/usr/bin/env bash
# ============================================================
# GensanPOS — paste this ENTIRE file in DigitalOcean console
# Login: root + your droplet password
# Requires: /tmp/gensanpos-release.tar.gz (already uploaded)
# ============================================================
set -euo pipefail

PUBLIC_IP="${PUBLIC_IP:-157.245.144.237}"
TARBALL="/tmp/gensanpos-release.tar.gz"

if [[ "${EUID:-0}" -ne 0 ]]; then echo "Run as root"; exit 1; fi
if [[ ! -f "${TARBALL}" ]]; then
  echo "ERROR: Missing ${TARBALL}"
  echo "Upload from PC: scp D:\\GensanPOS\\dist\\gensanpos-release.tar.gz root@${PUBLIC_IP}:/tmp/"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
echo "========== GensanPOS deploy on ${PUBLIC_IP} =========="

echo "==> [1/8] System packages + swap"
apt-get update -y
apt-get upgrade -y
if ! swapon --show | grep -q '/swapfile'; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
apt-get install -y curl git ufw fail2ban nginx postgresql postgresql-contrib rsync

if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
if ! command -v dotnet >/dev/null; then
  curl -fsSL https://packages.microsoft.com/config/ubuntu/24.04/packages-microsoft-prod.deb -o /tmp/msprod.deb
  dpkg -i /tmp/msprod.deb && apt-get update -y
  apt-get install -y aspnetcore-runtime-10.0
fi

install -d -o www-data -g www-data /var/www/gensanpos/{api,web}
install -d -o www-data -g www-data /var/lib/gensanpos/uploads
install -d -m 750 /etc/gensanpos /var/backups/gensanpos

PG_VER="$(ls /etc/postgresql 2>/dev/null | head -1 || true)"
if [[ -n "${PG_VER}" ]]; then
  install -m 644 /dev/stdin "/etc/postgresql/${PG_VER}/main/conf.d/99-gensanpos.conf" <<'PGTUNE'
listen_addresses = 'localhost'
max_connections = 30
shared_buffers = 128MB
effective_cache_size = 256MB
maintenance_work_mem = 64MB
work_mem = 4MB
PGTUNE
  systemctl restart postgresql
fi

ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
systemctl enable --now fail2ban

echo "==> [2/8] Environment secrets"
DB_PASS="$(openssl rand -hex 20)"
JWT_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
cat > /etc/gensanpos/gensanpos.env <<EOF
GENSANPOS_PUBLIC_HOST=${PUBLIC_IP}
GENSANPOS_DOMAIN=${PUBLIC_IP}
Cors__AllowedOrigins__0=http://${PUBLIC_IP}
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
chmod 600 /etc/gensanpos/gensanpos.env

echo "==> [3/8] PostgreSQL database"
DB_PASS="$(grep '^ConnectionStrings__DefaultConnection=' /etc/gensanpos/gensanpos.env | sed 's/^[^=]*=//' | tr -d '"' | sed -n 's/.*Password=\([^;]*\).*/\1/p')"

sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'gensanpos') THEN
    CREATE ROLE gensanpos LOGIN PASSWORD '${DB_PASS}';
  ELSE
    ALTER ROLE gensanpos WITH PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;
SQL
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='gensanpos'" | grep -q 1 \
  || sudo -u postgres createdb -O gensanpos gensanpos

echo "==> [4/8] systemd services"
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

echo "==> [5/8] Deploy application"
TMP="$(mktemp -d)"
tar -xzf "${TARBALL}" -C "${TMP}"
rsync -a --delete "${TMP}/gensanpos-release/api/" /var/www/gensanpos/api/
rsync -a --delete "${TMP}/gensanpos-release/web/" /var/www/gensanpos/web/
ln -sfn /var/lib/gensanpos/uploads /var/www/gensanpos/api/uploads
chown -R www-data:www-data /var/www/gensanpos /var/lib/gensanpos/uploads
rm -rf "${TMP}"

systemctl daemon-reload
systemctl enable gensanpos-api gensanpos-web nginx postgresql
systemctl restart gensanpos-api gensanpos-web

echo "Waiting for API (migrations + seed)..."
for i in $(seq 1 30); do
  curl -sf http://127.0.0.1:5170/health >/dev/null && break
  sleep 2
done

echo "==> [6/8] Nginx"
cat > /etc/nginx/sites-available/gensanpos <<NGINX
limit_req_zone \$binary_remote_addr zone=gensanpos_api:10m rate=30r/s;
limit_req_zone \$binary_remote_addr zone=gensanpos_web:10m rate=60r/s;
upstream gensanpos_api { server 127.0.0.1:5170; keepalive 8; }
upstream gensanpos_web { server 127.0.0.1:3000; keepalive 8; }
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name ${PUBLIC_IP};
    client_max_body_size 25M;
    location /api/ {
        limit_req zone=gensanpos_api burst=60 nodelay;
        proxy_pass http://gensanpos_api/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";
    }
    location /health {
        proxy_pass http://gensanpos_api/health;
        access_log off;
    }
    location / {
        limit_req zone=gensanpos_web burst=120 nodelay;
        proxy_pass http://gensanpos_web;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX
ln -sf /etc/nginx/sites-available/gensanpos /etc/nginx/sites-enabled/gensanpos
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "==> [7/8] Daily backup cron"
cat > /usr/local/bin/gensanpos-backup <<'BACKUP'
#!/usr/bin/env bash
set -euo pipefail
source /etc/gensanpos/gensanpos.env
parse() { echo "${ConnectionStrings__DefaultConnection}" | sed -n "s/.*${1}=\([^;]*\).*/\1/p"; }
export PGHOST="$(parse Host)" PGPORT="$(parse Port)" PGDATABASE="$(parse Database)"
export PGUSER="$(parse Username)" PGPASSWORD="$(parse Password)"
PGHOST="${PGHOST:-127.0.0.1}" PGPORT="${PGPORT:-5432}"
install -d -m 750 /var/backups/gensanpos
OUT="/var/backups/gensanpos/gensanpos-$(date +%Y%m%d-%H%M%S).dump"
pg_dump -Fc -f "${OUT}" && chmod 640 "${OUT}"
find /var/backups/gensanpos -name 'gensanpos-*.dump' -mtime +14 -delete
echo "Backup: ${OUT}"
BACKUP
chmod 755 /usr/local/bin/gensanpos-backup
echo "0 2 * * * root /usr/local/bin/gensanpos-backup >> /var/log/gensanpos-backup.log 2>&1" > /etc/cron.d/gensanpos-backup
chmod 644 /etc/cron.d/gensanpos-backup
/usr/local/bin/gensanpos-backup || true

echo "==> [8/8] Health"
curl -sf http://127.0.0.1:5170/health && echo " API OK"
curl -sf -o /dev/null -w "Web: %{http_code}\n" http://127.0.0.1:3000/
curl -sf "http://${PUBLIC_IP}/health" && echo " Public OK" || echo "WARN: check firewall"

echo ""
echo "=============================================="
echo " DONE — open: http://${PUBLIC_IP}/"
echo ""
echo " TEMP login (change NOW):"
echo "   owner@gensanpos.com / Owner@123"
echo ""
echo " Change password — run these in this console:"
echo "   set -a && source /etc/gensanpos/gensanpos.env && set +a"
echo "   read -s -p 'New owner password: ' P && echo"
echo "   sudo -u www-data dotnet /var/www/gensanpos/api/GensanPOS.API.dll admin set-password --email owner@gensanpos.com --password \"\$P\""
echo "   sed -i 's/^Seed__BootstrapDemoAccounts=true/Seed__BootstrapDemoAccounts=false/' /etc/gensanpos/gensanpos.env"
echo "   systemctl restart gensanpos-api"
echo "=============================================="
