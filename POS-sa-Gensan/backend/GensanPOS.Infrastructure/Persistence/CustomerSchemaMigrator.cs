using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Persistence;

public static class CustomerSchemaMigrator
{
    public static async Task ApplyAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        var conn = context.Database.GetDbConnection();
        await conn.OpenAsync(cancellationToken);

        await EnsureColumnAsync(conn, "Customers", "CustomerType", "INTEGER NOT NULL DEFAULT 0", cancellationToken);
        await EnsureColumnAsync(conn, "Customers", "CreditLimit", "REAL NOT NULL DEFAULT 0", cancellationToken);
        await EnsureColumnAsync(conn, "Customers", "IsBlacklisted", "INTEGER NOT NULL DEFAULT 0", cancellationToken);
        await EnsureColumnAsync(conn, "Customers", "CreatedByUserId", "VARCHAR NULL", cancellationToken);
        await EnsureColumnAsync(conn, "Customers", "CustomerCode", "VARCHAR NULL", cancellationToken);
        await EnsureColumnAsync(conn, "Customers", "EnableCredit", "INTEGER NOT NULL DEFAULT 0", cancellationToken);
        await EnsureColumnAsync(conn, "Customers", "PaymentTerms", "INTEGER NOT NULL DEFAULT 0", cancellationToken);
        await EnsureColumnAsync(conn, "Customers", "DueDays", "INTEGER NOT NULL DEFAULT 0", cancellationToken);
        await EnsureColumnAsync(conn, "Customers", "CustomPaymentTerms", "VARCHAR NULL", cancellationToken);
        await EnsureColumnAsync(conn, "Customers", "AllowCheque", "INTEGER NOT NULL DEFAULT 0", cancellationToken);
        await EnsureColumnAsync(conn, "Customers", "IsBlocked", "INTEGER NOT NULL DEFAULT 0", cancellationToken);

        await BackfillCustomerCodesAsync(conn, cancellationToken);

        await conn.CloseAsync();
    }

    private static async Task BackfillCustomerCodesAsync(
        System.Data.Common.DbConnection conn,
        CancellationToken cancellationToken)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            UPDATE Customers
            SET CustomerCode = 'CUS-' || printf('%04d', (
                SELECT COUNT(*) FROM Customers c2
                WHERE c2.rowid <= Customers.rowid
                  AND (c2.CustomerCode IS NULL OR c2.CustomerCode = '')
            ))
            WHERE CustomerCode IS NULL OR CustomerCode = '';
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
