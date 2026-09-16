#!/usr/bin/env bash
# Run on production AFTER API deploy with inventory sync fix.
# 1) DB backup  2) Reconcile product stock from batches  3) Verify SS Angle Bar
set -eu

SQL="/tmp/reconcile-product-stock-from-batches.sql"
PRODUCT_NAME="SS Angle Bar 202 3mm x 1"

if [[ ! -f "${SQL}" ]]; then
  echo "ERROR: Missing ${SQL} — upload deploy/scripts/reconcile-product-stock-from-batches.sql first"
  exit 1
fi

BACKUP="/var/backups/gensanpos-pre-inventory-reconcile-$(date +%Y-%m-%d-%H%M%S).dump"
echo "==> DB backup: ${BACKUP}"
install -d -m 750 /var/backups
sudo -u postgres pg_dump -Fc gensanpos > "${BACKUP}"
ls -lh "${BACKUP}"

echo "==> Reconcile Product.StockQuantity from active batch sums"
sudo -u postgres psql -v ON_ERROR_STOP=1 -d gensanpos -f "${SQL}"

echo "==> Verify: ${PRODUCT_NAME}"
sudo -u postgres psql -d gensanpos -c "
SELECT
  p.\"Sku\",
  p.\"Name\",
  p.\"StockQuantity\" AS product_stock,
  COALESCE(SUM(b.\"Quantity\") FILTER (WHERE b.\"IsActive\"), 0) AS batch_total,
  CASE
    WHEN p.\"StockQuantity\" = COALESCE(SUM(b.\"Quantity\") FILTER (WHERE b.\"IsActive\"), 0) THEN 'OK'
    ELSE 'MISMATCH'
  END AS sync_status
FROM \"Products\" p
LEFT JOIN \"ProductBatches\" b ON b.\"ProductId\" = p.\"Id\"
WHERE p.\"Name\" = '${PRODUCT_NAME}'
GROUP BY p.\"Id\", p.\"Sku\", p.\"Name\", p.\"StockQuantity\";
"

echo "==> Batch detail"
sudo -u postgres psql -d gensanpos -c "
SELECT b.\"BatchCode\", b.\"Quantity\", b.\"IsActive\"
FROM \"ProductBatches\" b
JOIN \"Products\" p ON p.\"Id\" = b.\"ProductId\"
WHERE p.\"Name\" = '${PRODUCT_NAME}'
ORDER BY b.\"ReceivedDate\", b.\"CreatedAt\";
"

echo "Inventory reconcile complete."
