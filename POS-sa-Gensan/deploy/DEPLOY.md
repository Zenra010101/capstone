# GensanPOS — Production deployment (DigitalOcean)

> **No domain yet?** Use **[DEPLOY-IP.md](./DEPLOY-IP.md)** for HTTP staging on `157.245.144.237`.

Target server: **Ubuntu 24.04**, **1GB RAM**, IP **157.245.144.237**  
Stack: **PostgreSQL** + **ASP.NET API** + **Next.js** + **Nginx** + **HTTPS**

## Architecture

```
Internet → Nginx :443 (HTTPS)
              ├─ /api/*  → 127.0.0.1:5170  (GensanPOS.API, systemd)
              └─ /*      → 127.0.0.1:3000  (Next.js standalone, systemd)

PostgreSQL → 127.0.0.1:5432 only (not public)
Uploads    → /var/lib/gensanpos/uploads
Backups    → /var/backups/gensanpos/
```

Memory caps (systemd): API **400MB**, Web **350MB**, Postgres tuned for **128MB** shared_buffers.

---

## Prerequisites

1. **Domain name** pointing to `157.245.144.237` (A record). Let's Encrypt needs this.  
   Example: `pos.yourshop.com` → `157.245.144.237`
2. SSH access as `root` (or sudo user).
3. Build machine with **Node 20+**, **.NET 10 SDK**, and **git** (your PC is fine).

---

## Step 1 — One-time server bootstrap

SSH to the droplet:

```bash
ssh root@157.245.144.237
```

Clone the repo (or upload `deploy/` folder):

```bash
git clone <your-repo-url> /opt/gensanpos
cd /opt/gensanpos
chmod +x deploy/scripts/*.sh
sudo bash deploy/scripts/01-server-bootstrap.sh
```

This installs: .NET 10 runtime, Node 20, PostgreSQL, Nginx, Certbot, UFW, fail2ban, **2GB swap**, app directories.

---

## Step 2 — Environment secrets

```bash
sudo cp /opt/gensanpos/deploy/env/gensanpos.env.example /etc/gensanpos/gensanpos.env
sudo chmod 600 /etc/gensanpos/gensanpos.env
sudo nano /etc/gensanpos/gensanpos.env
```

Set at minimum:

| Variable | Example |
|----------|---------|
| `GENSANPOS_DOMAIN` | `pos.yourshop.com` |
| `Cors__AllowedOrigins__0` | `https://pos.yourshop.com` |
| `ConnectionStrings__DefaultConnection` | `Host=127.0.0.1;Port=5432;Database=gensanpos;Username=gensanpos;Password=...` |
| `Jwt__Secret` | `openssl rand -base64 48` |

---

## Step 3 — PostgreSQL database

```bash
sudo bash /opt/gensanpos/deploy/scripts/02-setup-postgresql.sh
```

Verify (localhost only):

```bash
sudo -u postgres psql -c "\l" | grep gensanpos
```

---

## Step 4 — Build release (on your PC, recommended)

**Do not build on 1GB RAM** if you can avoid it — use your dev machine:

```powershell
cd D:\GensanPOS
.\deploy\scripts\build-release.ps1
```

Or Linux/macOS:

```bash
bash deploy/scripts/build-release.sh
```

Upload:

```bash
scp dist/gensanpos-release.tar.gz root@157.245.144.237:/tmp/
```

---

## Step 5 — Deploy application

On the server:

```bash
sudo bash /opt/gensanpos/deploy/scripts/03-deploy-release.sh /tmp/gensanpos-release.tar.gz
```

First start runs DB seed (owner/cashier accounts). Default logins (change after first login):

| Role | Email | Password |
|------|-------|----------|
| Owner | owner@gensanpos.com | Owner@123 |
| Cashier | cashier@gensanpos.com | Cashier@123 |

Import production catalog (optional):

```bash
cd /var/www/gensanpos/api
sudo -u www-data dotnet GensanPOS.API.dll catalog-import --file /opt/gensanpos/backend/data/client-production-catalog.csv
```

---

## Step 6 — Nginx + HTTPS

```bash
sudo bash /opt/gensanpos/deploy/scripts/04-configure-nginx-ssl.sh
```

Open: `https://YOUR_DOMAIN`

---

## Step 7 — Daily PostgreSQL backup

```bash
sudo cp /opt/gensanpos/deploy/scripts/backup-database.sh /usr/local/bin/gensanpos-backup
sudo chmod +x /usr/local/bin/gensanpos-backup
echo "0 2 * * * root /usr/local/bin/gensanpos-backup >> /var/log/gensanpos-backup.log 2>&1" | sudo tee /etc/cron.d/gensanpos-backup
```

Restore example (stop API first):

```bash
systemctl stop gensanpos-api
sudo -u postgres pg_restore -d gensanpos --clean --if-exists /var/backups/gensanpos/gensanpos-YYYYMMDD-HHMMSS.dump
systemctl start gensanpos-api
```

---

## Security checklist

| Item | Status |
|------|--------|
| UFW: only 22, 80, 443 | `01-server-bootstrap.sh` |
| PostgreSQL not public | `listen_addresses = localhost` |
| API/Web bind localhost only | systemd + Nginx |
| JWT secret in env file | `/etc/gensanpos/gensanpos.env` |
| Login rate limit | 10/min per IP |
| fail2ban | enabled |
| Auto-restart on crash | `Restart=always` in systemd |

---

## Operations

```bash
# Status
systemctl status gensanpos-api gensanpos-web nginx postgresql

# Logs
journalctl -u gensanpos-api -f
journalctl -u gensanpos-web -f

# Restart after env change
systemctl restart gensanpos-api gensanpos-web

# Health
curl -s http://127.0.0.1:5170/health
```

Redeploy new version:

1. Build tarball on PC  
2. `scp` to `/tmp/`  
3. `sudo bash deploy/scripts/03-deploy-release.sh /tmp/gensanpos-release.tar.gz`

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `502 Bad Gateway` | `systemctl status gensanpos-api gensanpos-web` — services must be active |
| DB connection failed | Check `/etc/gensanpos/gensanpos.env` password; `02-setup-postgresql.sh` |
| Certbot fails | DNS must point to droplet; port 80 open |
| OOM during build | Build on PC; server has swap from bootstrap |
| CORS errors | `Cors__AllowedOrigins__0` must match `https://your-domain` |

---

## Files in this folder

| Path | Purpose |
|------|---------|
| `env/gensanpos.env.example` | Production environment template |
| `nginx/*.template` | Nginx site configs |
| `systemd/*.service` | API + Web units with memory limits |
| `postgresql/99-gensanpos-tuning.conf` | 1GB RAM Postgres tuning |
| `scripts/*.sh` | Bootstrap, DB, deploy, SSL, backup, build |
