using GensanPOS.Infrastructure.Services;
using GensanPOS.Domain.Entities;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GensanPOS.Infrastructure.Persistence;

/// <summary>One-time migration: existing product stock → LEGACY batch rows.</summary>
public static class ProductBatchLegacyMigrator
{
    public static async Task ApplyAsync(AppDbContext context, ILogger? logger = null)
    {
        var productsNeedingBatch = await context.Products
            .Where(p => p.StockQuantity > 0)
            .Where(p => !context.ProductBatches.Any(b => b.ProductId == p.Id))
            .ToListAsync();

        if (productsNeedingBatch.Count == 0)
            return;

        foreach (var product in productsNeedingBatch)
        {
            context.ProductBatches.Add(ProductBatchStockHelper.CreateLegacyBatch(product));
        }

        await context.SaveChangesAsync();
        logger?.LogInformation(
            "Product batch legacy migration: created {Count} LEGACY batch(es) for existing stock.",
            productsNeedingBatch.Count);
    }
}
