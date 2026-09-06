# Inventory reset procedures

Controlled resets for **test baseline** and **go-live**. Master catalog is always preserved.

## Preserved (never deleted)

- Products (SKU, barcodes, cost, selling price, specs)
- Categories, Suppliers, Users, Roles, Store settings
- Customers (master records; balances clear when receivables are wiped)

## Removed (transactional wipe)

Sales, sale items, payments, receivables, cheques, GRS/returns/exchanges, stock receiving, adjustments, all product batches, inventory ledger, sales report verification QR records, and related operational audit log rows.

---

## Phase 1 — Test baseline (`TEST-OPENING`)

**Goal:** Clean environment with **50 units** (each product's UOM) per active product for FIFO/POS/receiving validation.

### 0. Backup verification (required before execute)

Creates a fresh dump (optional), verifies the latest file with `pg_restore -l`, and optionally restores into a temporary `gensanpos_verify` database (then drops it). **Does not change live data** unless you use `--restore-test` (uses a separate temp DB only).

**From Windows:**

```powershell
cd D:\GensanPOS
.\deploy\scripts\verify-backup.ps1 -Create -RestoreTest
```

**On the server:**

```bash
sudo bash /tmp/gensanpos-reset-scripts/verify-backup.sh --create --restore-test
```

Archive the printed backup path (e.g. `/var/backups/gensanpos/gensanpos-YYYYMMDD-HHMMSS.dump`).

### 1. Dry-run (required first)

**From Windows** (recommended — uploads to `/tmp/gensanpos-reset-scripts` on the server):

```powershell
cd D:\GensanPOS
.\deploy\scripts\reset-inventory-test-baseline.ps1 -Mode dry-run
```

**On the server directly** (after scripts are in `/tmp/gensanpos-reset-scripts`):

```bash
sudo bash /tmp/gensanpos-reset-scripts/reset-inventory-test-baseline.sh dry-run
```

If you have the full repo at `/opt/gensanpos`, you can also run from there after `git pull`.

Dry-run reports:

| Metric | Meaning |
|--------|---------|
| Active products to receive TEST-OPENING | Products that will get a batch @ 50 |
| Sales records to delete | |
| Stock receiving records to delete | |
| Product batches to delete | Includes OPENING, LEGACY, receiving-linked |
| Inventory transactions to delete | |
| Sale line items | |
| Goods return slips (GRS) | |
| Inventory adjustment requests | |
| Customer receivables | |
| Operational audit log rows | Selected entity types only |

**Review the dry-run output before execute.** Execute also creates `gensanpos-pre-test-reset-*.dump` immediately before wiping.

### 2. Execute (after you approve the dry-run report)

```powershell
.\deploy\scripts\reset-inventory-test-baseline.ps1 -Mode execute
```

Or on the server:

```bash
sudo bash /tmp/gensanpos-reset-scripts/reset-inventory-test-baseline.sh execute
```

Prompts for `RESET-TEST`. Steps:

1. Full `pg_dump` to `/var/backups/gensanpos/gensanpos-pre-test-reset-*.dump`
2. Stop `gensanpos-api`
3. Wipe transactional data (single transaction)
4. Insert one `TEST-OPENING` batch per active product (qty **50**, cost/sell from product master, `ReceivedDate` = 2020-01-01 for predictable FIFO)
5. Ledger rows with `Reference = TEST-OPENING`
6. Start `gensanpos-api`

**Not production inventory.** Label is `TEST-OPENING`, not `OPENING`.

---

## Phase 2 — Go-live (after testing)

Same **wipe** as Phase 1, then load **real** counts — **do not** seed 50 again.

### Option A — Opening batches (no receiving documents)

Use batch code **`OPENING`**, real quantity per SKU, ledger `Reference = OPENING`. Mirrors product-create initial stock.

### Option B — Stock Receiving

Wipe only; leave stock at 0; enter all inventory through approved receiving (best audit trail).

### Option C — Hybrid

`OPENING` for on-hand legacy stock; receiving for post-go-live deliveries.

Go-live wipe (no seed):

```bash
sudo bash deploy/scripts/reset-inventory-go-live-wipe.sh dry-run   # same counts as test dry-run
sudo bash deploy/scripts/reset-inventory-go-live-wipe.sh execute   # prompts RESET-GOLIVE
```

Then load real counts via `OPENING` batches or Stock Receiving.

---

## Safety

1. Always dry-run first and archive the output.
2. Execute only during a maintenance window with no cashiers on POS.
3. Keep the pre-reset `pg_dump` until go-live is verified.
4. Optional: clear orphaned files under `/var/lib/gensanpos/uploads` after receiving wipe.
