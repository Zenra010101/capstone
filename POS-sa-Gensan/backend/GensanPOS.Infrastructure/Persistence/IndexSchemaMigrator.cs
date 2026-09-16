using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Persistence;

/// <summary>
/// Applies performance indexes to existing databases (SQLite dev + PostgreSQL production).
/// Safe to run on every startup — uses IF NOT EXISTS.
/// </summary>
public static class IndexSchemaMigrator
{
    private static readonly string[] Indexes =
    [
        "CREATE INDEX IF NOT EXISTS \"IX_Products_SupplierId\" ON \"Products\" (\"SupplierId\")",
        "CREATE INDEX IF NOT EXISTS \"IX_Products_IsActive_CategoryId\" ON \"Products\" (\"IsActive\", \"CategoryId\")",
        "CREATE INDEX IF NOT EXISTS \"IX_StockReceivings_Status\" ON \"StockReceivings\" (\"Status\")",
        "CREATE INDEX IF NOT EXISTS \"IX_StockReceivings_Status_CreatedAt\" ON \"StockReceivings\" (\"Status\", \"CreatedAt\")",
        "CREATE INDEX IF NOT EXISTS \"IX_StockReceivingItems_ProductId\" ON \"StockReceivingItems\" (\"ProductId\")",
        "CREATE INDEX IF NOT EXISTS \"IX_StockReceivingItems_ProductId_StockReceivingId\" ON \"StockReceivingItems\" (\"ProductId\", \"StockReceivingId\")",
        "CREATE INDEX IF NOT EXISTS \"IX_AuditLogs_EntityType_EntityId_CreatedAt\" ON \"AuditLogs\" (\"EntityType\", \"EntityId\", \"CreatedAt\")",
        "CREATE INDEX IF NOT EXISTS \"IX_AuditLogs_Category_CreatedAt\" ON \"AuditLogs\" (\"Category\", \"CreatedAt\")",
        "CREATE INDEX IF NOT EXISTS \"IX_Sales_CustomerId_CreatedAt\" ON \"Sales\" (\"CustomerId\", \"CreatedAt\")",
        "CREATE INDEX IF NOT EXISTS \"IX_GoodsReturnSlips_OriginalInvoiceNumber\" ON \"GoodsReturnSlips\" (\"OriginalInvoiceNumber\")",
        "CREATE INDEX IF NOT EXISTS \"IX_GoodsReturnSlips_Status_WorkflowKind\" ON \"GoodsReturnSlips\" (\"Status\", \"WorkflowKind\")",
        "CREATE INDEX IF NOT EXISTS \"IX_CustomerReceivables_Status_DueDate\" ON \"CustomerReceivables\" (\"Status\", \"DueDate\")",
        "CREATE INDEX IF NOT EXISTS \"IX_InventoryTransactions_Reference\" ON \"InventoryTransactions\" (\"Reference\")",
        "CREATE INDEX IF NOT EXISTS \"IX_InventoryAdjustmentRequests_CreatedAt\" ON \"InventoryAdjustmentRequests\" (\"CreatedAt\")",
        "CREATE INDEX IF NOT EXISTS \"IX_InventoryAdjustmentRequests_Status_CreatedAt\" ON \"InventoryAdjustmentRequests\" (\"Status\", \"CreatedAt\")",
    ];

    public static async Task ApplyAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        foreach (var sql in Indexes)
            await context.Database.ExecuteSqlRawAsync(sql, cancellationToken);
    }
}
