-- Dry-run counts for inventory test reset. Read-only; no data changes.

\echo '=== GensanPOS inventory test reset - DRY RUN ==='
\echo ''

SELECT 'Active products to receive TEST-OPENING (qty 50 each)' AS metric,
       COUNT(*)::bigint AS count
FROM "Products"
WHERE "IsActive" = TRUE;

SELECT 'Inactive products (stock will be set to 0, no batch)' AS metric,
       COUNT(*)::bigint AS count
FROM "Products"
WHERE "IsActive" = FALSE;

SELECT 'Sales records to delete' AS metric,
       COUNT(*)::bigint AS count
FROM "Sales";

SELECT 'Stock receiving records to delete' AS metric,
       COUNT(*)::bigint AS count
FROM "StockReceivings";

SELECT 'Product batches to delete' AS metric,
       COUNT(*)::bigint AS count
FROM "ProductBatches";

SELECT 'Inventory transactions to delete' AS metric,
       COUNT(*)::bigint AS count
FROM "InventoryTransactions";

\echo ''
\echo '--- Additional transactional scope ---'

SELECT 'Sale line items' AS metric, COUNT(*)::bigint AS count FROM "SaleItems";
SELECT 'Goods return slips (GRS)' AS metric, COUNT(*)::bigint AS count FROM "GoodsReturnSlips";
SELECT 'Inventory adjustment requests' AS metric, COUNT(*)::bigint AS count FROM "InventoryAdjustmentRequests";
SELECT 'Customer receivables' AS metric, COUNT(*)::bigint AS count FROM "CustomerReceivables";
SELECT 'Receivable payments' AS metric, COUNT(*)::bigint AS count FROM "ReceivablePayments";
SELECT 'Operational audit log rows (inventory/sales)' AS metric,
       COUNT(*)::bigint AS count
FROM "AuditLogs"
WHERE "EntityType" IN (
    'Sale',
    'ProductBatch',
    'StockReceiving',
    'InventoryAdjustmentRequest',
    'GoodsReturnSlip',
    'GoodsExchange',
    'InventoryTransaction',
    'CustomerReceivable',
    'ReceivablePayment',
    'SaleCheque'
);

\echo ''
\echo 'After execute: each active product gets 1 TEST-OPENING batch @ 50 units + 1 ledger row.'
\echo 'Master data preserved: Products, Categories, Suppliers, Users, Roles, Settings, Barcodes, Prices.'
