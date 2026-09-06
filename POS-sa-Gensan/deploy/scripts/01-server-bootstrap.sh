#!/usr/bin/env bash
# One-time server setup for Ubuntu 24.04 (DigitalOcean 1GB).
# Run as root on 157.245.144.237:
#   curl -fsSL ... | bash   OR   bash 01-server-bootstrap.sh
set -euo pipefail

if [[ "${EUID:-0}" -ne 0 ]]; then
  echo "Run as root: sudo bash $0"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> System update"
apt-get update -y
apt-get upgrade -y

echo "==> 2GB swap (recommended for builds on 1GB RAM)"
if ! swapon --show | grep -q '/swapfile'; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Base packages"
apt-get install -y curl git ufw fail2ban nginx certbot python3-certbot-nginx \
  postgresql postgresql-contrib rsync unzip

echo "==> Node.js 20 LTS"
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "==> .NET 10 ASP.NET runtime"
if ! command -v dotnet >/dev/null; then
  curl -fsSL https://packages.microsoft.com/config/ubuntu/24.04/packages-microsoft-prod.deb -o /tmp/packages-microsoft-prod.deb
  dpkg -i /tmp/packages-microsoft-prod.deb
  apt-get update -y
  apt-get install -y aspnetcore-runtime-10.0
fi

echo "==> App directories"
install -d -o www-data -g www-data /var/www/gensanpos/{api,web}
install -d -o www-data -g www-data /var/lib/gensanpos/uploads
install -d -m 750 /etc/gensanpos
install -d -m 750 /var/backups/gensanpos
install -d -m 755 /var/www/certbot

echo "==> PostgreSQL tuning (1GB)"
PG_VER="$(ls /etc/postgresql | head -1)"
if [[ -n "${PG_VER}" ]]; then
  install -m 644 /dev/stdin "/etc/postgresql/${PG_VER}/main/conf.d/99-gensanpos.conf" <<'EOF'
listen_addresses = 'localhost'
max_connections = 30
shared_buffers = 128MB
effective_cache_size = 256MB
maintenance_work_mem = 64MB
work_mem = 4MB
EOF
  systemctl restart postgresql
fi

echo "==> Firewall"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "==> fail2ban"
systemctl enable --now fail2ban

echo "==> systemd units (enable after first deploy)"
if [[ -f /opt/gensanpos/deploy/systemd/gensanpos-api.service ]]; then
  cp /opt/gensanpos/deploy/systemd/*.service /etc/systemd/system/
  systemctl daemon-reload
fi

echo ""
echo "Bootstrap complete."
echo "Next: copy deploy/env/gensanpos.env.example to /etc/gensanpos/gensanpos.env"
echo "Then: bash deploy/scripts/02-setup-postgresql.sh"
echo "Then: build release on your PC and run 03-deploy-release.sh on server"
