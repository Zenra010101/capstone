# GensanPOS — IP-based deployment (no domain yet)

**Server:** `157.245.144.237` · Ubuntu 24.04 · 1GB RAM  
**URL (staging):** http://157.245.144.237/

When you buy a domain, use `deploy/scripts/08-switch-to-domain.sh` (see bottom).

---

## Overview

| Step | Where | What |
|------|--------|------|
| 1 | Server | Bootstrap OS, PostgreSQL, Nginx, swap |
| 2 | Server | Generate env (DB password, JWT, CORS for IP) |
| 3 | Server | Create PostgreSQL database |
| 4 | **Your PC** | Build release tarball |
| 5 | Server | Deploy app (EF migrations run on first API start) |
| 6 | Server | Nginx HTTP for IP |
| 7 | Server | Backup cron + change default passwords |

---

## A. On your Windows PC (build)

Requires: **.NET 10 SDK**, **Node 20+**, **tar** (Windows 10+).

```powershell
cd D:\GensanPOS
.\deploy\scripts\build-release.ps1
```

Upload to droplet:

```powershell
scp D:\GensanPOS\dist\gensanpos-release.tar.gz root@157.245.144.237:/tmp/
```

Optional — upload repo for scripts only (if not using git on server):

```powershell
scp -r D:\GensanPOS\deploy root@157.245.144.237:/opt/gensanpos/
```

---

## B. On the droplet (SSH)

```bash
ssh root@157.245.144.237
```

### 1. Get deploy scripts on the server

**Option A — git (recommended):**

```bash
git clone <YOUR_REPO_URL> /opt/gensanpos
cd /opt/gensanpos
chmod +x deploy/scripts/*.sh
```

**Option B — you only uploaded `deploy/`:**

```bash
mkdir -p /opt/gensanpos
# deploy folder should be at /opt/gensanpos/deploy
chmod +x /opt/gensanpos/deploy/scripts/*.sh
```

### 2. One-time bootstrap

```bash
cd /opt/gensanpos
bash deploy/scripts/01-server-bootstrap.sh
```

Installs: PostgreSQL (localhost only), Nginx, .NET 10 runtime, Node 20, UFW, fail2ban, 2GB swap.

### 3. Environment + secrets

```bash
bash deploy/scripts/00-generate-env.sh 157.245.144.237
```

Creates `/etc/gensanpos/gensanpos.env` with:

- Random **PostgreSQL** password
- Random **JWT** secret
- `Cors__AllowedOrigins__0=http://157.245.144.237`
- `Seed__BootstrapDemoAccounts=true` (first boot only)

### 4. PostgreSQL database

```bash
bash deploy/scripts/02-setup-postgresql.sh
```

Uses the password from `/etc/gensanpos/gensanpos.env`. Port **5432** is not exposed publicly.

### 5. Deploy application

```bash
bash deploy/scripts/03-deploy-release.sh /tmp/gensanpos-release.tar.gz
```

On first start the API will:

1. Run **EF Core migrations** (`InitialCreate`) on PostgreSQL
2. Seed roles, default categories
3. Create demo users (only while `Seed__BootstrapDemoAccounts=true`)

Check:

```bash
curl -s http://127.0.0.1:5170/health
systemctl status gensanpos-api gensanpos-web
```

### 6. Nginx (HTTP, IP)

```bash
bash deploy/scripts/04-configure-nginx-ip.sh
```

Open in browser: **http://157.245.144.237/**

### 7. Daily backups

```bash
bash deploy/scripts/05-install-backup-cron.sh
/usr/local/bin/gensanpos-backup   # test once
ls -la /var/backups/gensanpos/
```

### 8. Change default passwords (required)

Temporary logins (only until you run hardening):

| Role | Email | Password |
|------|-------|----------|
| Owner | owner@gensanpos.com | Owner@123 |
| Cashier | cashier@gensanpos.com | Cashier@123 |

**On the server:**

```bash
bash deploy/scripts/07-harden-accounts.sh
```

This will:

- Set a new owner password
- Optionally update cashier or disable demo accounts
- Set `Seed__BootstrapDemoAccounts=false` and restart API

**Manual alternative:**

```bash
set -a && source /etc/gensanpos/gensanpos.env && set +a
sudo -u www-data dotnet /var/www/gensanpos/api/GensanPOS.API.dll \
  admin set-password --email owner@gensanpos.com --password 'YourStrongPasswordHere'
sed -i 's/^Seed__BootstrapDemoAccounts=true/Seed__BootstrapDemoAccounts=false/' /etc/gensanpos/gensanpos.env
systemctl restart gensanpos-api
```

### 9. Optional — import production catalog

**Do not** `source /etc/gensanpos/gensanpos.env` before `dotnet catalog-import`. Semicolons in the PostgreSQL connection string break bash `export`, and the CLI falls back to SQLite (`gensanpos.db`).

Upload catalog files to `/var/lib/gensanpos/catalog/` (or keep them under `/opt/gensanpos/backend/data/` if the repo is cloned there).

```bash
# Stainless catalog (replaces active products — default)
bash /opt/gensanpos/deploy/scripts/import-catalog.sh \
  /opt/gensanpos/backend/data/client-production-catalog.csv

# Accessories only (keeps existing stainless products)
bash /opt/gensanpos/deploy/scripts/import-catalog.sh \
  /var/lib/gensanpos/catalog/accessories-catalog.csv --no-archive
```

From Windows (upload accessories CSV):

```powershell
.\scripts\upload-accessories-catalog.ps1 -Server root@157.245.144.237
```

Then on the server, run the `import-catalog.sh` line printed by that script.

---

## Redeploy (new version)

On PC: `.\deploy\scripts\build-release.ps1` then `scp` tarball.

On server:

```bash
bash /opt/gensanpos/deploy/scripts/03-deploy-release.sh /tmp/gensanpos-release.tar.gz
```

Migrations apply automatically on API restart.

---

## When you have a domain

1. DNS **A record**: `pos.yourshop.com` → `157.245.144.237`
2. On server:

```bash
bash /opt/gensanpos/deploy/scripts/08-switch-to-domain.sh pos.yourshop.com
```

That updates `GENSANPOS_DOMAIN`, `Cors__AllowedOrigins__0` (HTTPS), runs Certbot, and reloads Nginx.

---

## Security checklist

| Item | Status |
|------|--------|
| PostgreSQL `listen_addresses = localhost` | Bootstrap |
| UFW: 22, 80, (443 after SSL) | Bootstrap |
| API/Web on 127.0.0.1 only | systemd + Nginx |
| Strong DB + JWT in `/etc/gensanpos/gensanpos.env` | `00-generate-env.sh` |
| Demo passwords changed | `07-harden-accounts.sh` |
| Daily `pg_dump` | `05-install-backup-cron.sh` |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| 502 Bad Gateway | `systemctl status gensanpos-api gensanpos-web` |
| Browser “This page couldn’t load” on `/pos` | Use **`http://`** (not `https://`). Log in at `/login` first. Hard refresh (Ctrl+Shift+R). On server: `bash deploy/scripts/PASTE-FIX-WEB-LOAD.sh` |
| DB connection error | Password in env matches `02-setup-postgresql.sh`; `systemctl restart postgresql` |
| CORS / login from browser | `Cors__AllowedOrigins__0` must be `http://157.245.144.237` (no trailing slash) |
| Migration failed | `journalctl -u gensanpos-api -n 100` |
| Can't login after hardening | Use password from `07-harden-accounts.sh`, not Owner@123 |

---

## Files reference

| Script | Purpose |
|--------|---------|
| `00-generate-env.sh` | Secrets + IP CORS |
| `01-server-bootstrap.sh` | OS packages |
| `02-setup-postgresql.sh` | DB + user |
| `03-deploy-release.sh` | Install tarball |
| `04-configure-nginx-ip.sh` | HTTP reverse proxy |
| `04-configure-nginx-ssl.sh` | HTTPS (domain) |
| `05-install-backup-cron.sh` | Daily backup |
| `07-harden-accounts.sh` | Passwords + disable demo seed |
| `08-switch-to-domain.sh` | Domain + SSL migration |
