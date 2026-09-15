using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Persistence;

public static class SupplierSchemaMigrator
{
    public static async Task ApplyAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        var conn = context.Database.GetDbConnection();
        await conn.OpenAsync(cancellationToken);

        await EnsureColumnAsync(conn, "Suppliers", "PaymentTerms", "INTEGER NOT NULL DEFAULT 0", cancellationToken);
        await EnsureColumnAsync(conn, "Suppliers", "CustomPaymentTerms", "VARCHAR NULL", cancellationToken);
        await EnsureColumnAsync(conn, "Suppliers", "Notes", "VARCHAR NULL", cancellationToken);
        await EnsureColumnAsync(conn, "Suppliers", "SupplierCode", "VARCHAR NULL", cancellationToken);
        await EnsureColumnAsync(conn, "Suppliers", "DeliveryNotes", "VARCHAR NULL", cancellationToken);
        await EnsureColumnAsync(conn, "Suppliers", "SupplierRemarks", "VARCHAR NULL", cancellationToken);
        await EnsureColumnAsync(conn, "Suppliers", "Status", "INTEGER NOT NULL DEFAULT 0", cancellationToken);
        await EnsureColumnAsync(conn, "Suppliers", "CreatedByUserId", "VARCHAR NULL", cancellationToken);

        await BackfillSupplierCodesAsync(conn, cancellationToken);

        await EnsureContactTableAsync(conn, cancellationToken);
        await EnsureAttachmentTableAsync(conn, cancellationToken);
        await BackfillCreatedByAsync(conn, context, cancellationToken);

        await conn.CloseAsync();
    }

    private static async Task BackfillSupplierCodesAsync(
        System.Data.Common.DbConnection conn,
        CancellationToken cancellationToken)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            UPDATE Suppliers
            SET SupplierCode = 'SUP-' || printf('%04d', (
                SELECT COUNT(*) FROM Suppliers s2
                WHERE s2.rowid <= Suppliers.rowid
                  AND (s2.SupplierCode IS NULL OR s2.SupplierCode = '')
            ))
            WHERE SupplierCode IS NULL OR SupplierCode = '';
            """;
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task BackfillCreatedByAsync(
        System.Data.Common.DbConnection conn,
        AppDbContext context,
        CancellationToken cancellationToken)
    {
        var ownerId = await context.Users
            .Where(u => u.Email == "owner@gensanpos.com")
            .Select(u => u.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (ownerId == Guid.Empty) return;

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"UPDATE Suppliers SET CreatedByUserId = '{ownerId}' WHERE CreatedByUserId IS NULL;";
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task EnsureContactTableAsync(System.Data.Common.DbConnection conn, CancellationToken cancellationToken)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS SupplierContacts (
                Id VARCHAR NOT NULL PRIMARY KEY,
                CreatedAt VARCHAR NOT NULL,
                UpdatedAt VARCHAR NULL,
                SupplierId VARCHAR NOT NULL,
                Name VARCHAR NOT NULL,
                Role INTEGER NOT NULL DEFAULT 0,
                Phone VARCHAR NULL,
                Email VARCHAR NULL,
                IsPrimary INTEGER NOT NULL DEFAULT 0
            );
            """;
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task EnsureAttachmentTableAsync(System.Data.Common.DbConnection conn, CancellationToken cancellationToken)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS SupplierAttachments (
                Id VARCHAR NOT NULL PRIMARY KEY,
                CreatedAt VARCHAR NOT NULL,
                UpdatedAt VARCHAR NULL,
                SupplierId VARCHAR NOT NULL,
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
