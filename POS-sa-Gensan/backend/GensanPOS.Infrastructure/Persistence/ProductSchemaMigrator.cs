using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Persistence;

public static class ProductSchemaMigrator
{
    public static async Task ApplyAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        var conn = context.Database.GetDbConnection();
        await conn.OpenAsync(cancellationToken);

        await EnsureColumnAsync(conn, "Products", "Diameter", "TEXT NULL", cancellationToken);
        await EnsureColumnAsync(conn, "Products", "Schedule", "TEXT NULL", cancellationToken);
        await EnsureColumnAsync(conn, "Products", "Width", "TEXT NULL", cancellationToken);
        await EnsureColumnAsync(conn, "Products", "Height", "TEXT NULL", cancellationToken);
        await EnsureColumnAsync(conn, "Products", "MaterialType", "TEXT NULL", cancellationToken);
        await EnsureColumnAsync(conn, "Products", "SupplierId", "TEXT NULL", cancellationToken);

        await conn.CloseAsync();
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
