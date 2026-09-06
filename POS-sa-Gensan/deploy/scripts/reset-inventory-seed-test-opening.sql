-- Seed TEST-OPENING batches for every active product (50 units of each product's UOM).
-- Run after reset-inventory-wipe-transactional.sql inside the same transaction.

\set test_qty 50
\set test_batch_code 'TEST-OPENING'
\set test_received_date '2020-01-01'

INSERT INTO "ProductBatches" (
    "Id",
    "ProductId",
    "BatchCode",
    "CostPrice",
    "SellingPrice",
    "ReceivedQuantity",
    "Quantity",
    "ReceivedDate",
    "IsActive",
    "CreatedAt"
)
SELECT
    gen_random_uuid(),
    p."Id",
    :'test_batch_code',
    p."CostPrice",
    p."UnitPrice",
    :test_qty,
    :test_qty,
    (:'test_received_date')::date,
    TRUE,
    (NOW() AT TIME ZONE 'UTC')
FROM "Products" p
WHERE p."IsActive" = TRUE;

UPDATE "Products" p
SET "StockQuantity" = :test_qty,
    "UpdatedAt" = (NOW() AT TIME ZONE 'UTC')
WHERE p."IsActive" = TRUE;

INSERT INTO "InventoryTransactions" (
    "Id",
    "ProductId",
    "Type",
    "Quantity",
    "StockBefore",
    "StockAfter",
    "Reference",
    "Notes",
    "ProductBatchId",
    "UserId",
    "CreatedAt"
)
SELECT
    gen_random_uuid(),
    b."ProductId",
    0,
    :test_qty,
    0,
    :test_qty,
    :'test_batch_code',
    'Test baseline - not production inventory',
    b."Id",
    (
        SELECT u."Id"
        FROM "Users" u
        INNER JOIN "Roles" r ON u."RoleId" = r."Id"
        WHERE r."Name" = 'Owner'
        ORDER BY u."CreatedAt"
        LIMIT 1
    ),
    (NOW() AT TIME ZONE 'UTC')
FROM "ProductBatches" b
WHERE b."BatchCode" = :'test_batch_code';
