-- One-time repair: set Product.StockQuantity = sum of active batch quantities.
-- Run when product stock and batch totals have drifted (e.g. before SyncProductStockAsync fix).
-- PostgreSQL (gensanpos database).

BEGIN;

UPDATE "Products" p
SET
  "StockQuantity" = COALESCE((
    SELECT SUM(b."Quantity")
    FROM "ProductBatches" b
    WHERE b."ProductId" = p."Id" AND b."IsActive"
  ), 0),
  "UpdatedAt" = NOW()
WHERE p."IsActive";

COMMIT;

-- Verify a single SKU (optional):
-- SELECT p."Sku", p."StockQuantity", COALESCE(SUM(b."Quantity"), 0) AS batch_total
-- FROM "Products" p
-- LEFT JOIN "ProductBatches" b ON b."ProductId" = p."Id" AND b."IsActive"
-- WHERE p."Sku" = 'YOUR-SKU'
-- GROUP BY p."Id", p."Sku", p."StockQuantity";
