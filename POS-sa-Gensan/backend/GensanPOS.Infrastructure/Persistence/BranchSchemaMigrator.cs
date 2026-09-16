using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Persistence;

public static class BranchSchemaMigrator
{
    public static async Task ApplyAsync(
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var conn = context.Database.GetDbConnection();
        await conn.OpenAsync(cancellationToken);

        await EnsureTableAsync(conn, cancellationToken);

        await EnsureColumnAsync(
            conn, "Users", "BranchId", "TEXT NULL", cancellationToken);

        await EnsureColumnAsync(
            conn, "ProductBatches", "BranchId", "TEXT NULL", cancellationToken);

        await EnsureColumnAsync(
            conn, "StockReceivings", "BranchId", "TEXT NULL", cancellationToken);

        await EnsureColumnAsync(
            conn, "Sales", "BranchId", "TEXT NULL", cancellationToken);

        await conn.CloseAsync();
    }

    private static async Task EnsureTableAsync(
        System.Data.Common.DbConnection conn,
        CancellationToken cancellationToken)
    {
        await using var cmd = conn.CreateCommand();

        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS Branches (
                Id TEXT NOT NULL PRIMARY KEY,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NULL,
                Name TEXT NOT NULL,
                Code TEXT NOT NULL,
                Address TEXT NULL,
                IsActive INTEGER NOT NULL DEFAULT 1
            );

            CREATE UNIQUE INDEX IF NOT EXISTS IX_Branches_Code
                ON Branches (Code);
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

            await using var reader =
                await info.ExecuteReaderAsync(cancellationToken);

            while (await reader.ReadAsync(cancellationToken))
            {
                if (string.Equals(
                    reader.GetString(1),
                    column,
                    StringComparison.OrdinalIgnoreCase))
                {
                    exists = true;
                    break;
                }
            }
        }

        if (exists)
            return;

        await using var alter = conn.CreateCommand();

        alter.CommandText =
            $"ALTER TABLE {table} ADD COLUMN {column} {sqlType};";

        await alter.ExecuteNonQueryAsync(cancellationToken);
    }
}