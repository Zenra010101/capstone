using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Persistence;

public static class ChequeSchemaMigrator
{
    public static async Task ApplyAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        var conn = context.Database.GetDbConnection();
        await conn.OpenAsync(cancellationToken);

        await EnsureColumnAsync(conn, "SaleCheques", "BounceReason", "TEXT NULL", cancellationToken);
        await EnsureColumnAsync(conn, "SaleCheques", "CustomerReceivableId", "TEXT NULL", cancellationToken);
        await EnsureColumnAsync(conn, "SaleCheques", "ClearedReceivablePaymentId", "TEXT NULL", cancellationToken);
        await EnsureColumnAsync(conn, "SaleCheques", "ReceivablePaymentId", "TEXT NULL", cancellationToken);
        await EnsureColumnAsync(conn, "SaleCheques", "ProcessedByUserId", "TEXT NULL", cancellationToken);

        await EnsureColumnAsync(conn, "ReceivablePayments", "IsChequePending", "INTEGER NOT NULL DEFAULT 0", cancellationToken);
        await EnsureColumnAsync(conn, "ReceivablePayments", "IsVoided", "INTEGER NOT NULL DEFAULT 0", cancellationToken);
        await EnsureColumnAsync(conn, "ReceivablePayments", "SaleChequeId", "TEXT NULL", cancellationToken);

        await EnsureBouncedChequeHistoryTableAsync(conn, cancellationToken);

        await conn.CloseAsync();
    }

    private static async Task EnsureBouncedChequeHistoryTableAsync(
        System.Data.Common.DbConnection conn,
        CancellationToken cancellationToken)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS BouncedChequeHistories (
                Id TEXT NOT NULL PRIMARY KEY,
                SaleChequeId TEXT NOT NULL,
                ChequeNumber TEXT NOT NULL,
                BankName TEXT NOT NULL,
                Branch TEXT NULL,
                CustomerName TEXT NOT NULL,
                CustomerId TEXT NULL,
                InvoiceNumber TEXT NOT NULL,
                Amount REAL NOT NULL,
                MaturityDate TEXT NOT NULL,
                BouncedDate TEXT NOT NULL,
                Reason TEXT NOT NULL,
                PenaltyAmount REAL NOT NULL DEFAULT 0,
                ProcessedByUserId TEXT NOT NULL,
                CustomerReceivableId TEXT NULL,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NULL
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
