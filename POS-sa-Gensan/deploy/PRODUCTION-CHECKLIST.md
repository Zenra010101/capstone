# Production deployment checklist (1GB droplet)

**IP:** `157.245.144.237` · **URL:** http://157.245.144.237/

---

## On your PC (once per release)

```powershell
cd D:\GensanPOS
.\deploy\scripts\build-release.ps1
# Tarball: D:\GensanPOS\dist\gensanpos-release.tar.gz (~66 MB)

scp D:\GensanPOS\dist\gensanpos-release.tar.gz root@157.245.144.237:/tmp/
scp -r D:\GensanPOS\deploy root@157.245.144.237:/opt/gensanpos/
# Or: git clone your repo to /opt/gensanpos on the server
```

---

## On the droplet (first time)

```bash
ssh root@157.245.144.237

# If using git:
# git clone <REPO> /opt/gensanpos

mkdir -p /opt/gensanpos
# ensure /opt/gensanpos/deploy/scripts exists

cd /opt/gensanpos
chmod +x deploy/scripts/*.sh
bash deploy/scripts/deploy-production-ip.sh 157.245.144.237 /tmp/gensanpos-release.tar.gz
bash deploy/scripts/07-harden-accounts.sh
```

**One script does:** bootstrap · env secrets · PostgreSQL · deploy · Nginx · backup cron · health checks.

---

## What runs automatically

| Item | How |
|------|-----|
| PostgreSQL localhost-only | `01-server-bootstrap.sh` |
| Strong DB + JWT | `00-generate-env.sh` |
| EF migrations | API startup (`Database.MigrateAsync`) |
| Nginx → API :5170, Web :3000 | `04-configure-nginx-ip.sh` |
| systemd restart on crash | `gensanpos-api` / `gensanpos-web` |
| Daily pg_dump 02:00 UTC | `05-install-backup-cron.sh` |
| UFW 22, 80, 443 | bootstrap |

---

## Security (required)

1. Run `07-harden-accounts.sh` (new owner password, `Seed__BootstrapDemoAccounts=false`)
2. Confirm `/etc/gensanpos/gensanpos.env` is mode `600`
3. Do not expose port `5432` publicly

---

## Verify

```bash
curl http://157.245.144.237/health
systemctl status gensanpos-api gensanpos-web nginx postgresql
ls /var/backups/gensanpos/
```

---

## Redeploy

```powershell
.\deploy\scripts\build-release.ps1
scp D:\GensanPOS\dist\gensanpos-release.tar.gz root@157.245.144.237:/tmp/
```

```bash
bash /opt/gensanpos/deploy/scripts/03-deploy-release.sh /tmp/gensanpos-release.tar.gz
```

---

## Later (domain + HTTPS)

```bash
bash /opt/gensanpos/deploy/scripts/08-switch-to-domain.sh pos.yourshop.com
```
