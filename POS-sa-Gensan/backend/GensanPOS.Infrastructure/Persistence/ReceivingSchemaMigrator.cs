using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Persistence;

public static class ReceivingSchemaMigrator
{
    public static async Task ApplyAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        var conn = context.Database.GetDbConnection();
        await conn.OpenAsync(cancellationToken);

        await EnsureColumnAsync(conn, "StockReceivings", "DeliveryReceiptNumber", "TEXT NULL", cancellationToken);
        await EnsureColumnAsync(conn, "StockReceivings", "ApprovalNotes", "TEXT NULL", cancellationToken);
        await EnsureColumnAsync(conn, "StockReceivings", "PurchaseOrderId", "TEXT NULL", cancellationToken);
        await EnsureColumnAsync(conn, "StockReceivingItems", "ExpectedQuantity", "INTEGER NULL", cancellationToken);
        await EnsureColumnAsync(conn, "StockReceivingItems", "CostPrice", "REAL NOT NULL DEFAULT 0", cancellationToken);
        await EnsureColumnAsync(conn, "StockReceivingItems", "SellingPrice", "REAL NOT NULL DEFAULT 0", cancellationToken);
        await BackfillSellingPriceAsync(conn, cancellationToken);
        await EnsureColumnAsync(conn, "StockReceivingItems", "Remarks", "TEXT NULL", cancellationToken);

        await EnsureTableAsync(conn, cancellationToken);

        await conn.CloseAsync();
    }

    private static async Task BackfillSellingPriceAsync(
        System.Data.Common.DbConnection conn,
        CancellationToken cancellationToken)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            UPDATE StockReceivingItems
            SET SellingPrice = (
                SELECT UnitPrice FROM Products WHERE Products.Id = StockReceivingItems.ProductId
            )
            WHERE SellingPrice = 0;
            """;
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task EnsureTableAsync(System.Data.Common.DbConnection conn, CancellationToken cancellationToken)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS StockReceivingAttachments (
                Id TEXT NOT NULL PRIMARY KEY,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NULL,
                StockReceivingId TEXT NOT NULL,
                FileName TEXT NOT NULL,
                StoredFileName TEXT NOT NULL,
                ContentType TEXT NOT NULL,
                FileSizeBytes INTEGER NOT NULL,
                Description TEXT NULL,
                UploadedByUserId TEXT NOT NULL
            );
            """;
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
