using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Persistence;

public static class AdjustmentSchemaMigrator
{
    public static async Task ApplyAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        var conn = context.Database.GetDbConnection();
        await conn.OpenAsync(cancellationToken);

        await EnsureColumnAsync(conn, "InventoryAdjustmentRequests", "AdjustmentType", "INTEGER NOT NULL DEFAULT 4", cancellationToken);
        await EnsureColumnAsync(conn, "InventoryAdjustmentRequests", "Notes", "TEXT NULL", cancellationToken);
        await EnsureColumnAsync(conn, "InventoryAdjustmentRequests", "ApprovalNotes", "TEXT NULL", cancellationToken);
        await EnsureColumnAsync(conn, "InventoryAdjustmentRequests", "CountingSessionId", "TEXT NULL", cancellationToken);

        await EnsureAdjustmentLinesTableAsync(conn, cancellationToken);
        await EnsureColumnAsync(conn, "InventoryTransactions", "ProductBatchId", "TEXT NULL", cancellationToken);
        await EnsureIndexAsync(conn, "IX_InventoryTransactions_ProductBatchId", "InventoryTransactions", "ProductBatchId", cancellationToken);

        await conn.CloseAsync();
    }

    private static async Task EnsureAdjustmentLinesTableAsync(
        System.Data.Common.DbConnection conn,
        CancellationToken cancellationToken)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS InventoryAdjustmentRequestLine (
                Id TEXT NOT NULL PRIMARY KEY,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NULL,
                InventoryAdjustmentRequestId TEXT NOT NULL,
                ProductBatchId TEXT NOT NULL,
                SystemQuantity INTEGER NOT NULL DEFAULT 0,
                ActualQuantity INTEGER NOT NULL DEFAULT 0,
                Difference INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (InventoryAdjustmentRequestId) REFERENCES InventoryAdjustmentRequests(Id) ON DELETE CASCADE,
                FOREIGN KEY (ProductBatchId) REFERENCES ProductBatches(Id)
            );
            CREATE INDEX IF NOT EXISTS IX_InventoryAdjustmentRequestLine_InventoryAdjustmentRequestId
                ON InventoryAdjustmentRequestLine (InventoryAdjustmentRequestId);
            CREATE INDEX IF NOT EXISTS IX_InventoryAdjustmentRequestLine_ProductBatchId
                ON InventoryAdjustmentRequestLine (ProductBatchId);
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

    private static async Task EnsureIndexAsync(
        System.Data.Common.DbConnection conn,
        string indexName,
        string table,
        string column,
        CancellationToken cancellationToken)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"CREATE INDEX IF NOT EXISTS {indexName} ON {table} ({column});";
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }
}
