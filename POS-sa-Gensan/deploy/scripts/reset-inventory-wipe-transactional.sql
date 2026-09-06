-- Wipe transactional inventory / sales data. Master catalog (Products, Categories, etc.) is preserved.
-- Run inside a transaction via reset-inventory-test-baseline.sh (execute mode only).

-- Break sale replacement links before deleting sales.
UPDATE "Sales"
SET "ReplacesSaleId" = NULL,
    "ReplacedBySaleId" = NULL
WHERE "ReplacesSaleId" IS NOT NULL
   OR "ReplacedBySaleId" IS NOT NULL;

DELETE FROM "BouncedChequeHistories";
DELETE FROM "ReceivablePayments";
DELETE FROM "SaleCheques";
DELETE FROM "GoodsExchangeLines";
DELETE FROM "GoodsExchanges";
DELETE FROM "GoodsReturnSlipItems";
DELETE FROM "SalesReturnDeductions";
DELETE FROM "GoodsReturnSlips";
DELETE FROM "InventoryAdjustmentRequestLine";
DELETE FROM "InventoryAdjustmentRequests";
DELETE FROM "SaleItems";
DELETE FROM "SalePayments";
DELETE FROM "CustomerReceivables";
DELETE FROM "Sales";
DELETE FROM "InventoryTransactions";
DELETE FROM "ProductBatches";
DELETE FROM "StockReceivingAttachments";
DELETE FROM "StockReceivingItems";
DELETE FROM "StockReceivings";
DELETE FROM "SalesReportVerifications";

DELETE FROM "AuditLogs"
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

-- Zero on-hand qty before re-seeding (active products re-seeded separately).
UPDATE "Products"
SET "StockQuantity" = 0,
    "UpdatedAt" = (NOW() AT TIME ZONE 'UTC');
