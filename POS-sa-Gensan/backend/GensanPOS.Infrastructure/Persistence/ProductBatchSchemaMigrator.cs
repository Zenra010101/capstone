using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Persistence;

public static class ProductBatchSchemaMigrator
{
    public static async Task ApplyAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        var conn = context.Database.GetDbConnection();
        await conn.OpenAsync(cancellationToken);

        await EnsureTableAsync(conn, cancellationToken);
        await EnsureColumnAsync(conn, "ProductBatches", "ReceivedQuantity", "INTEGER NOT NULL DEFAULT 0", cancellationToken);
        await EnsureColumnAsync(conn, "ProductBatches", "StockReceivingItemId", "VARCHAR NULL", cancellationToken);
        await EnsureColumnAsync(conn, "ProductBatches", "SupplierId", "VARCHAR NULL", cancellationToken);
        await EnsureColumnAsync(conn, "ProductBatches", "ReceivedByUserId", "VARCHAR NULL", cancellationToken);
        await EnsureColumnAsync(conn, "ProductBatches", "ApprovedByUserId", "VARCHAR NULL", cancellationToken);
        await BackfillReceivedQuantityAsync(conn, cancellationToken);
        await EnsureUniqueIndexAsync(
            conn, "IX_ProductBatches_StockReceivingItemId", "ProductBatches", "StockReceivingItemId", cancellationToken);
        await EnsureColumnAsync(conn, "SaleItems", "ProductBatchId", "VARCHAR NULL", cancellationToken);
        await EnsureColumnAsync(conn, "SaleItems", "BatchCodeAtSale", "VARCHAR NULL", cancellationToken);
        await EnsureColumnAsync(conn, "SaleItems", "BatchReceivedDate", "VARCHAR NULL", cancellationToken);
        await BackfillSaleItemBatchSnapshotsAsync(conn, cancellationToken);
        await EnsureSaleItemsBatchIndexAsync(conn, cancellationToken);

        await conn.CloseAsync();
    }

    private static async Task EnsureTableAsync(System.Data.Common.DbConnection conn, CancellationToken cancellationToken)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS ProductBatches (
                Id VARCHAR NOT NULL PRIMARY KEY,
                CreatedAt VARCHAR NOT NULL,
                UpdatedAt VARCHAR NULL,
                ProductId VARCHAR NOT NULL,
                BatchCode VARCHAR NULL,
                CostPrice REAL NOT NULL DEFAULT 0,
                SellingPrice REAL NOT NULL DEFAULT 0,
                ReceivedQuantity INTEGER NOT NULL DEFAULT 0,
                Quantity INTEGER NOT NULL DEFAULT 0,
                ReceivedDate VARCHAR NOT NULL,
                IsActive INTEGER NOT NULL DEFAULT 1,
                StockReceivingId VARCHAR NULL
            );
            CREATE INDEX IF NOT EXISTS IX_ProductBatches_ProductId ON ProductBatches (ProductId);
            CREATE INDEX IF NOT EXISTS IX_ProductBatches_ProductId_ReceivedDate_CreatedAt
                ON ProductBatches (ProductId, ReceivedDate, CreatedAt);
            """;
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task BackfillReceivedQuantityAsync(
        System.Data.Common.DbConnection conn,
        CancellationToken cancellationToken)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText =
            "UPDATE ProductBatches SET ReceivedQuantity = Quantity WHERE ReceivedQuantity = 0 AND Quantity > 0;";
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task BackfillSaleItemBatchSnapshotsAsync(
        System.Data.Common.DbConnection conn,
        CancellationToken cancellationToken)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            UPDATE SaleItems
            SET BatchCodeAtSale = (
                    SELECT BatchCode FROM ProductBatches WHERE ProductBatches.Id = SaleItems.ProductBatchId
                ),
                BatchReceivedDate = (
                    SELECT ReceivedDate FROM ProductBatches WHERE ProductBatches.Id = SaleItems.ProductBatchId
                )
            WHERE ProductBatchId IS NOT NULL
              AND (BatchCodeAtSale IS NULL OR BatchReceivedDate IS NULL);
            """;
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task EnsureSaleItemsBatchIndexAsync(
        System.Data.Common.DbConnection conn,
        CancellationToken cancellationToken)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText =
            "CREATE INDEX IF NOT EXISTS IX_SaleItems_ProductBatchId ON SaleItems (ProductBatchId);";
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task EnsureUniqueIndexAsync(
        System.Data.Common.DbConnection conn,
        string indexName,
        string table,
        string column,
        CancellationToken cancellationToken)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText =
            $"CREATE UNIQUE INDEX IF NOT EXISTS {indexName} ON {table} ({column}) WHERE {column} IS NOT NULL;";
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task EnsureColumnAsync(
        System.Data.Common.DbConnection conn,
        string table,
        string column,
        string sqlType,
        CancellationToken cancellationToken)
    {
        var exists = false;
        await using (var info = conn.CreateCommand())
        {
            info.CommandText = $"PRAGMA table_info({table});";
            await using var reader = await info.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                if (string.Equals(reader.GetString(1), column, StringComparison.OrdinalIgnoreCase))
                {
                    exists = true;
                    break;
                }
            }
        }

        if (exists) return;

        await using var alter = conn.CreateCommand();
        alter.CommandText = $"ALTER TABLE {table} ADD COLUMN {column} {sqlType};";
        await alter.ExecuteNonQueryAsync(cancellationToken);
    }
}