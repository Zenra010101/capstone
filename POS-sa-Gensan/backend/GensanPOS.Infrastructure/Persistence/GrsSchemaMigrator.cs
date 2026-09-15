using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Persistence;

/// <summary>Applies additive SQLite schema updates when <see cref="DatabaseFacade.EnsureCreatedAsync"/> cannot alter existing tables.</summary>
public static class GrsSchemaMigrator
{
    public static async Task ApplyAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        var conn = context.Database.GetDbConnection();
        await conn.OpenAsync(cancellationToken);

        await EnsureColumnAsync(conn, "GoodsReturnSlips", "OriginalInvoiceNumber", "VARCHAR NOT NULL DEFAULT ''", cancellationToken);
        await EnsureColumnAsync(conn, "GoodsReturnSlips", "CustomerName", "VARCHAR NULL", cancellationToken);
        await EnsureColumnAsync(conn, "GoodsReturnSlips", "OriginalSaleDate", "VARCHAR NOT NULL DEFAULT '1970-01-01'", cancellationToken);
        await EnsureColumnAsync(conn, "GoodsReturnSlips", "RefundMethod", "INTEGER NOT NULL DEFAULT 0", cancellationToken);
        await EnsureColumnAsync(conn, "GoodsReturnSlips", "Status", "INTEGER NOT NULL DEFAULT 0", cancellationToken);
        await EnsureColumnAsync(conn, "GoodsReturnSlips", "VoidedAt", "VARCHAR NULL", cancellationToken);
        await EnsureColumnAsync(conn, "GoodsReturnSlips", "VoidedByUserId", "VARCHAR NULL", cancellationToken);
        await EnsureColumnAsync(conn, "GoodsReturnSlips", "VoidReason", "VARCHAR NULL", cancellationToken);

        // Phase 1 exchange workflow (additive; WorkflowKind 0 = legacy)
        await EnsureColumnAsync(conn, "GoodsReturnSlips", "WorkflowKind", "INTEGER NOT NULL DEFAULT 0", cancellationToken);
        await EnsureColumnAsync(conn, "GoodsReturnSlips", "SubmittedAt", "VARCHAR NULL", cancellationToken);
        await EnsureColumnAsync(conn, "GoodsReturnSlips", "SubmittedByUserId", "VARCHAR NULL", cancellationToken);
        await EnsureColumnAsync(conn, "GoodsReturnSlips", "ApprovedAt", "VARCHAR NULL", cancellationToken);
        await EnsureColumnAsync(conn, "GoodsReturnSlips", "ApprovedByUserId", "VARCHAR NULL", cancellationToken);
        await EnsureColumnAsync(conn, "GoodsReturnSlips", "ApprovalNotes", "VARCHAR NULL", cancellationToken);
        await EnsureColumnAsync(conn, "GoodsReturnSlips", "RejectedAt", "VARCHAR NULL", cancellationToken);
        await EnsureColumnAsync(conn, "GoodsReturnSlips", "RejectedByUserId", "VARCHAR NULL", cancellationToken);
        await EnsureColumnAsync(conn, "GoodsReturnSlips", "RejectionReason", "VARCHAR NULL", cancellationToken);
        await EnsureColumnAsync(conn, "GoodsReturnSlips", "StockRestoredAt", "VARCHAR NULL", cancellationToken);
        await EnsureColumnAsync(conn, "GoodsReturnSlips", "GoodsExchangeId", "VARCHAR NULL", cancellationToken);

        await EnsureColumnAsync(conn, "SaleItems", "PendingReturnQuantity", "INTEGER NOT NULL DEFAULT 0", cancellationToken);

        await EnsureColumnAsync(conn, "GoodsReturnSlipItems", "SellingPriceAtSale", "REAL NOT NULL DEFAULT 0", cancellationToken);
        await EnsureColumnAsync(conn, "GoodsReturnSlipItems", "CostPriceAtSale", "REAL NOT NULL DEFAULT 0", cancellationToken);
        await EnsureColumnAsync(conn, "GoodsReturnSlipItems", "ProductBatchId", "VARCHAR NULL", cancellationToken);
        await EnsureColumnAsync(conn, "GoodsReturnSlipItems", "BatchCode", "VARCHAR NULL", cancellationToken);
        await EnsureColumnAsync(conn, "GoodsReturnSlipItems", "BatchReceivedDate", "VARCHAR NULL", cancellationToken);
        await EnsureColumnAsync(conn, "GoodsReturnSlipItems", "Condition", "INTEGER NOT NULL DEFAULT 0", cancellationToken);

        await EnsureSalesReturnDeductionsTableAsync(conn, cancellationToken);
        await EnsureGoodsExchangeTablesAsync(conn, cancellationToken);
        await EnsureColumnAsync(conn, "GoodsExchangeLines", "CostPriceAtSale", "REAL NOT NULL DEFAULT 0", cancellationToken);
        await EnsureColumnAsync(conn, "GoodsExchangeLines", "ProfitAmount", "REAL NOT NULL DEFAULT 0", cancellationToken);

        await conn.CloseAsync();
    }

    /// <summary>Run after <see cref="ProductBatchSchemaMigrator"/> so SaleItems batch snapshot columns exist.</summary>
    public static async Task ApplyReturnBatchBackfillAsync(
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var conn = context.Database.GetDbConnection();
        var openedHere = conn.State != System.Data.ConnectionState.Open;
        if (openedHere)
            await conn.OpenAsync(cancellationToken);
        try
        {
            await BackfillReturnBatchSnapshotsAsync(conn, cancellationToken);
        }
        finally
        {
            if (openedHere)
                await conn.CloseAsync();
        }
    }

    private static async Task BackfillReturnBatchSnapshotsAsync(
        System.Data.Common.DbConnection conn,
        CancellationToken cancellationToken)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            UPDATE GoodsReturnSlipItems
            SET ProductBatchId = (
                    SELECT ProductBatchId FROM SaleItems WHERE SaleItems.Id = GoodsReturnSlipItems.SaleItemId
                ),
                BatchCode = (
                    SELECT BatchCodeAtSale FROM SaleItems WHERE SaleItems.Id = GoodsReturnSlipItems.SaleItemId
                ),
                BatchReceivedDate = (
                    SELECT BatchReceivedDate FROM SaleItems WHERE SaleItems.Id = GoodsReturnSlipItems.SaleItemId
                ),
                CostPriceAtSale = (
                    SELECT CostPriceAtSale FROM SaleItems WHERE SaleItems.Id = GoodsReturnSlipItems.SaleItemId
                )
            WHERE ProductBatchId IS NULL;
            """;
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task EnsureSalesReturnDeductionsTableAsync(
        System.Data.Common.DbConnection conn,
        CancellationToken cancellationToken)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS SalesReturnDeductions (
                Id VARCHAR NOT NULL PRIMARY KEY,
                GoodsReturnSlipId VARCHAR NOT NULL UNIQUE,
                OriginalSaleId VARCHAR NOT NULL,
                OriginalInvoiceNumber VARCHAR NOT NULL,
                DeductionDate VARCHAR NOT NULL,
                OriginalSaleDate VARCHAR NOT NULL,
                Amount REAL NOT NULL,
                ProcessedByUserId VARCHAR NOT NULL,
                IsReversed INTEGER NOT NULL DEFAULT 0,
                CreatedAt VARCHAR NOT NULL,
                UpdatedAt VARCHAR NULL,
                FOREIGN KEY (GoodsReturnSlipId) REFERENCES GoodsReturnSlips(Id),
                FOREIGN KEY (ProcessedByUserId) REFERENCES Users(Id)
            );
            CREATE INDEX IF NOT EXISTS IX_SalesReturnDeductions_DeductionDate ON SalesReturnDeductions(DeductionDate);
            """;
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task EnsureGoodsExchangeTablesAsync(
        System.Data.Common.DbConnection conn,
        CancellationToken cancellationToken)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS GoodsExchanges (
                Id VARCHAR NOT NULL PRIMARY KEY,
                GoodsReturnSlipId VARCHAR NOT NULL UNIQUE,
                ExchangeNumber VARCHAR NOT NULL UNIQUE,
                ReturnCreditTotal REAL NOT NULL,
                ReplacementTotal REAL NOT NULL,
                AmountPaid REAL NOT NULL,
                PaymentMethod INTEGER NULL,
                TopUpSaleId VARCHAR NULL,
                CompletedAt VARCHAR NOT NULL,
                CompletedByUserId VARCHAR NOT NULL,
                CreatedAt VARCHAR NOT NULL,
                UpdatedAt VARCHAR NULL,
                FOREIGN KEY (GoodsReturnSlipId) REFERENCES GoodsReturnSlips(Id) ON DELETE CASCADE,
                FOREIGN KEY (TopUpSaleId) REFERENCES Sales(Id),
                FOREIGN KEY (CompletedByUserId) REFERENCES Users(Id)
            );
            CREATE TABLE IF NOT EXISTS GoodsExchangeLines (
                Id VARCHAR NOT NULL PRIMARY KEY,
                GoodsExchangeId VARCHAR NOT NULL,
                ProductId VARCHAR NOT NULL,
                ProductName VARCHAR NOT NULL,
                ProductSku VARCHAR NOT NULL,
                Quantity INTEGER NOT NULL,
                UnitPrice REAL NOT NULL,
                LineTotal REAL NOT NULL,
                CreatedAt VARCHAR NOT NULL,
                UpdatedAt VARCHAR NULL,
                FOREIGN KEY (GoodsExchangeId) REFERENCES GoodsExchanges(Id) ON DELETE CASCADE,
                FOREIGN KEY (ProductId) REFERENCES Products(Id)
            );
            CREATE INDEX IF NOT EXISTS IX_GoodsExchanges_CompletedAt ON GoodsExchanges(CompletedAt);
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
                var name = reader.GetString(1);
                if (string.Equals(name, column, StringComparison.OrdinalIgnoreCase))
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
