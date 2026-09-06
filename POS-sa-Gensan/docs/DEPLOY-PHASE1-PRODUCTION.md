# Phase 1 GRS — Production deployment runbook (flag OFF)

**Approved deploy scope:** Ship Phase 1 **code + migration** to production/staging with  
`ExchangeWorkflow:Phase1Enabled = **false**`.

**Not in scope for this deploy:** Turning on the inspection workflow in production. Users must see **legacy GRS** only until a separate activation approval.

**UAT:** Completed locally/staging with flag ON. See [UAT-PHASE1-GRS-RUNBOOK.md](./UAT-PHASE1-GRS-RUNBOOK.md).

**Related:** [DEPLOY-PHASE1-GRS.md](./DEPLOY-PHASE1-GRS.md) · [GRS-BUSINESS-POLICY.md](./GRS-BUSINESS-POLICY.md) · [deploy/PRODUCTION-CHECKLIST.md](../deploy/PRODUCTION-CHECKLIST.md)

**Branch / release:** `feature/grs-phase1-approval-workflow` (merge to main before release build).

**Migration:** `20260603144603_GrsPhase1ApprovalWorkflow` (additive only).

---

## 1. Final deployment blocks (do not proceed until all checked)

### Business / product

- [x] Local/staging UAT passed (submit → approve/reject/cancel, inventory, UX, flag OFF legacy)
- [ ] Owner sign-off on **deploy with flag OFF** (this document)
- [ ] Store policy docs accepted ([GRS-BUSINESS-POLICY.md](./GRS-BUSINESS-POLICY.md))
- [ ] **Explicit:** no `Phase1Enabled: true` in production env for this release

### Code / release

- [ ] PR merged; release built from intended commit (`build-release.ps1`)
- [ ] `appsettings.json` and production env show `Phase1Enabled: false`
- [ ] No secrets committed; `/etc/gensanpos/gensanpos.env` reviewed on server

### Database

- [ ] Pre-deploy **manual backup** taken (in addition to daily cron)
- [ ] Maintenance window communicated (low traffic)
- [ ] Rollback owner assigned

### Infrastructure

- [ ] SSH access to droplet verified
- [ ] Disk space OK on server (`df -h`)
- [ ] `systemctl status postgresql nginx` healthy before deploy

### Post-deploy (same session)

- [ ] Health checks pass (section 5)
- [ ] Legacy GRS smoke test pass (section 7)
- [ ] `GET /api/app-features` → `exchangeWorkflowPhase1Enabled: false` (authenticated)
- [ ] No Phase 1 amber banner on Returns (production)

---

## 2. Migration / deploy order

| Step | Component | Action |
|------|-----------|--------|
| **0** | Release | Merge branch → tag/commit → `.\deploy\scripts\build-release.ps1` on Windows |
| **1** | Backup | Manual `pg_dump` **before** deploy (section 3) |
| **2** | API snapshot | Optional: copy current `/var/www/gensanpos/api` (section 4) |
| **3** | Web snapshot | Optional: copy current `/var/www/gensanpos/web` (section 4) |
| **4** | Config | Confirm production env: `ExchangeWorkflow__Phase1Enabled=false` (section below) |
| **5** | Deploy API + Web | `03-deploy-release.sh` — **API start runs EF `MigrateAsync`** (applies Phase 1 migration on PostgreSQL) |
| **6** | Verify migration | Check API logs + `__EFMigrationsHistory` (section 5) |
| **7** | Nginx | No change if already configured; confirm proxy still up |
| **8** | Health | Section 5 |
| **9** | Smoke | Section 7 (legacy GRS, flag OFF) |

**Order rule:** Backup → deploy (migration on API start) → health → legacy smoke.  
Do **not** enable Phase 1 flag as part of this release.

### Production environment (required)

On the server, `/etc/gensanpos/gensanpos.env` must include (or omit — default in appsettings is false):

```bash
ExchangeWorkflow__Phase1Enabled=false
```

ASP.NET binds `ExchangeWorkflow:Phase1Enabled` from this variable.  
After editing: `systemctl restart gensanpos-api`.

---

## 3. Database backup steps

### A. Manual pre-deploy backup (required)

On the **droplet** (as root):

```bash
# Load DB password from env
set -a
source /etc/gensanpos/gensanpos.env
set +a

STAMP=$(date +%Y%m%d-%H%M%S)
install -d -m 750 /var/backups/gensanpos
OUT="/var/backups/gensanpos/gensanpos-pre-phase1-${STAMP}.dump"

sudo -u postgres pg_dump -Fc -d gensanpos -f "${OUT}"
ls -lh "${OUT}"
echo "Pre-deploy backup: ${OUT}"
```

Keep the path written in your deploy log.

### B. Use existing backup script (optional extra)

```bash
/usr/local/bin/gensanpos-backup
ls -lt /var/backups/gensanpos/ | head -5
```

### C. Restore from backup (disaster rollback)

**Stop API first** to avoid active connections:

```bash
systemctl stop gensanpos-api

# Replace TIMESTAMP with your dump file
sudo -u postgres pg_restore -d gensanpos --clean --if-exists \
  /var/backups/gensanpos/gensanpos-pre-phase1-TIMESTAMP.dump

systemctl start gensanpos-api
```

Test restore on a **clone DB** first if unsure.  
If Phase 1 migration already applied and you only need code rollback, prefer **redeploying previous API build** without DB restore (section 6).

---

## 4. API / web snapshot steps (code rollback)

Before `03-deploy-release.sh`, snapshot current artifacts:

```bash
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p /var/backups/gensanpos/releases

tar -czf /var/backups/gensanpos/releases/api-before-phase1-${STAMP}.tar.gz -C /var/www/gensanpos api
tar -czf /var/backups/gensanpos/releases/web-before-phase1-${STAMP}.tar.gz -C /var/www/gensanpos web

ls -lh /var/backups/gensanpos/releases/*${STAMP}*
```

**Restore previous API/web only** (no DB restore):

```bash
systemctl stop gensanpos-api gensanpos-web

tar -xzf /var/backups/gensanpos/releases/api-before-phase1-TIMESTAMP.tar.gz -C /var/www/gensanpos
tar -xzf /var/backups/gensanpos/releases/web-before-phase1-TIMESTAMP.tar.gz -C /var/www/gensanpos
chown -R www-data:www-data /var/www/gensanpos

systemctl start gensanpos-api gensanpos-web
```

Migration columns can remain in DB while running older code **only if** old code tolerates new columns (Phase 1 migration is additive — older API may fail if it doesn’t know new columns). **Safest rollback:** restore DB dump from **before** migration + previous API tarball, or keep new API with `Phase1Enabled=false`.

---

## 5. Health checks

Run on the server after deploy:

```bash
# Services
systemctl is-active gensanpos-api gensanpos-web nginx postgresql

# API
curl -sf http://127.0.0.1:5170/health && echo " OK" || echo " FAIL"

# Web
curl -sf -o /dev/null -w "Web %{http_code}\n" http://127.0.0.1:3000/

# Public (via Nginx)
curl -sf -o /dev/null -w "Public %{http_code}\n" http://127.0.0.1/health
```

### Migration applied

```bash
sudo -u postgres psql -d gensanpos -c \
  "SELECT \"MigrationId\" FROM \"__EFMigrationsHistory\" ORDER BY \"MigrationId\";"
```

Expect row: `20260603144603_GrsPhase1ApprovalWorkflow`.

### API logs (migration / startup)

```bash
journalctl -u gensanpos-api -n 80 --no-pager
```

No repeated crash loop; migration errors must be resolved before smoke tests.

### Feature flag OFF (authenticated)

From a machine with login access:

```bash
# Login and read token, then:
curl -s http://127.0.0.1:5170/api/app-features \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expect: `"exchangeWorkflowPhase1Enabled": false`.

---

## 6. Rollback commands

| Situation | Action |
|-----------|--------|
| **Deploy bug, flag was OFF** | Redeploy previous release tarball OR restore api/web snapshots (section 4); DB usually unchanged |
| **Migration failed mid-start** | `systemctl stop gensanpos-api`; restore pre-deploy `pg_dump` (section 3C); redeploy previous tarball |
| **Need old code + old schema** | DB restore from pre-migration dump + previous api/web snapshots |
| **Accidentally enabled flag** | Set `ExchangeWorkflow__Phase1Enabled=false` in env; `systemctl restart gensanpos-api` |
| **Exchange slips exist in prod** | Do **not** run `dotnet ef database update` Down without data plan |

**Do not** set `Phase1Enabled: true` in production until a separate activation change request is approved.

---

## 7. Post-deploy legacy smoke-test checklist (flag OFF)

Perform on **production URL** as soon as deploy completes.  
Expect **legacy** behavior only.

| # | Test | Expected | Pass |
|---|------|----------|------|
| L1 | Open **Returns** | No Phase 1 amber “inspection workflow” banner | ☐ |
| L2 | **New return** dialog title | “New goods return” (not “Submit for inspection”) | ☐ |
| L3 | Refund method | Dropdown **visible** (legacy GRS only) | ☐ |
| L4 | Submit small operational return | GRS **Completed** immediately | ☐ |
| L5 | Product stock | **Increased** after complete (not pending) | ☐ |
| L6 | Invoice lookup | Available qty reduced | ☐ |
| L7 | Owner void completed GRS | Stock/deduction reversed | ☐ |
| L8 | POS + sales + inventory | No errors; existing flows OK | ☐ |
| L9 | `/api/app-features` | `exchangeWorkflowPhase1Enabled: false` | ☐ |

**Do not run** Phase 1 pending/approve tests on production until flag activation is approved.

---

## Windows PC — build and upload

```powershell
cd D:\GensanPOS
git checkout main   # after merge
git pull
.\deploy\scripts\build-release.ps1

scp D:\GensanPOS\dist\gensanpos-release.tar.gz root@157.245.144.237:/tmp/
```

## Droplet — deploy

```bash
ssh root@157.245.144.237

# Pre-deploy backup (section 3)
# Optional snapshots (section 4)

grep -i Phase1 /etc/gensanpos/gensanpos.env || echo "ExchangeWorkflow__Phase1Enabled=false" >> /etc/gensanpos/gensanpos.env

bash /opt/gensanpos/deploy/scripts/03-deploy-release.sh /tmp/gensanpos-release.tar.gz

# Sections 5–7
```

---

## After this deploy (activation — separate step, when ready)

1. Complete legacy smoke (section 7) and deploy log  
2. **Do not** set `Phase1Enabled: true` yet  
3. When approved for go-live workflow: follow **[ACTIVATE-PHASE1-PRODUCTION.md](./ACTIVATE-PHASE1-PRODUCTION.md)**  
   - Short supervised window → owner tests → cashier tests → inventory → no confusion → keep ON if stable  
4. See [DEPLOY-PHASE1-GRS.md](./DEPLOY-PHASE1-GRS.md) activation summary

**Deploy log template**

| Field | Value |
|-------|--------|
| Date / time | |
| Operator | |
| Git commit / tag | |
| Pre-deploy DB dump path | |
| API/web snapshot paths | |
| `Phase1Enabled` in prod env | false |
| Migration ID confirmed | |
| Smoke L1–L9 | pass / fail |
| Notes | |
