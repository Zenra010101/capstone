using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Persistence;

public static class ExpenseSchemaMigrator
{
    public static async Task ApplyAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        var conn = context.Database.GetDbConnection();
        await conn.OpenAsync(cancellationToken);

        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = """
                CREATE TABLE IF NOT EXISTS ExpenseCategories (
                    Id VARCHAR NOT NULL PRIMARY KEY,
                    CreatedAt VARCHAR NOT NULL,
                    UpdatedAt VARCHAR NULL,
                    Name VARCHAR NOT NULL,
                    Description VARCHAR NULL,
                    IsActive INTEGER NOT NULL DEFAULT 1,
                    CreatedByUserId VARCHAR NULL
                );
                """;
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }

        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = """
                CREATE TABLE IF NOT EXISTS ExpenseVouchers (
                    Id VARCHAR NOT NULL PRIMARY KEY,
                    CreatedAt VARCHAR NOT NULL,
                    UpdatedAt VARCHAR NULL,
                    VoucherNumber VARCHAR NOT NULL,
                    ExpenseDate VARCHAR NOT NULL,
                    CategoryId VARCHAR NOT NULL,
                    Payee VARCHAR NOT NULL,
                    Particulars VARCHAR NOT NULL,
                    Amount REAL NOT NULL,
                    PaymentMethod INTEGER NOT NULL DEFAULT 0,
                    Bank VARCHAR NULL,
                    ReferenceNumber VARCHAR NULL,
                    Remarks VARCHAR NULL,
                    Status INTEGER NOT NULL DEFAULT 0,
                    CreatedByUserId VARCHAR NOT NULL,
                    PaidByUserId VARCHAR NULL,
                    PaidAt VARCHAR NULL,
                    CancelledAt VARCHAR NULL
                );
                """;
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }

        await EnsureColumnAsync(conn, "ExpenseVouchers", "PaidByUserId", "VARCHAR NULL", cancellationToken);
        await EnsureColumnAsync(conn, "ExpenseVouchers", "CreatedByUserId", "VARCHAR NOT NULL DEFAULT ''", cancellationToken);

        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = """
                UPDATE ExpenseVouchers
                SET CreatedByUserId = PreparedByUserId
                WHERE (CreatedByUserId IS NULL OR CreatedByUserId = '')
                  AND EXISTS (
                    SELECT 1 FROM pragma_table_info('ExpenseVouchers') WHERE name = 'PreparedByUserId'
                  );
                """;
            try { await cmd.ExecuteNonQueryAsync(cancellationToken); } catch { /* column may not exist */ }
        }

        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = """
                CREATE TABLE IF NOT EXISTS ExpenseVoucherAttachments (
                    Id VARCHAR NOT NULL PRIMARY KEY,
                    CreatedAt VARCHAR NOT NULL,
                    UpdatedAt VARCHAR NULL,
                    ExpenseVoucherId VARCHAR NOT NULL,
                    FileName VARCHAR NOT NULL,
                    StoredFileName VARCHAR NOT NULL,
                    ContentType VARCHAR NOT NULL,
                    FileSizeBytes INTEGER NOT NULL,
                    Description VARCHAR NULL,
                    UploadedByUserId VARCHAR NOT NULL
                );
                """;
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }

        await EnsureColumnAsync(conn, "ExpenseVoucherAttachments", "FilePurgedAt", "VARCHAR NULL", cancellationToken);

        await conn.CloseAsync();
    }

    private static async Task EnsureColumnAsync(
        System.Data.Common.DbConnection conn,
        string table,
        string column,
        string definition,
        CancellationToken cancellationToken)
    {
        await using var check = conn.CreateCommand();
        check.CommandText = $"SELECT COUNT(*) FROM pragma_table_info('{table}') WHERE name = '{column}';";
        var exists = Convert.ToInt32(await check.ExecuteScalarAsync(cancellationToken)) > 0;
        if (exists) return;

        await using var alter = conn.CreateCommand();
        alter.CommandText = $"ALTER TABLE {table} ADD COLUMN {column} {definition};";
        await alter.ExecuteNonQueryAsync(cancellationToken);
    }
}
