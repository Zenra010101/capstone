using GensanPOS.Domain.Entities;

using GensanPOS.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;



namespace GensanPOS.Infrastructure.Services;



public static class ProductBatchStockHelper

{

    /// <summary>

    /// Recompute product on-hand from active batch quantities.

    /// Includes in-memory (tracked) batch changes not yet saved — required because

    /// <see cref="DbSet{T}.SumAsync"/> runs SQL and ignores pending quantity updates.

    /// </summary>

    public static async Task<int> SyncProductStockAsync(

        AppDbContext context,

        Product product,

        CancellationToken cancellationToken = default)

    {

        var productId = product.Id;



        var trackedBatches = context.ChangeTracker.Entries<ProductBatch>()

            .Where(e => e.Entity.ProductId == productId

                && e.Entity.IsActive

                && e.State != EntityState.Deleted)

            .Select(e => e.Entity)

            .ToList();



        var trackedIds = trackedBatches.Select(b => b.Id).ToHashSet();



        var untrackedBatches = await context.ProductBatches

            .AsNoTracking()

            .Where(b => b.ProductId == productId && b.IsActive && !trackedIds.Contains(b.Id))

            .ToListAsync(cancellationToken);



        var total = trackedBatches.Sum(b => b.Quantity) + untrackedBatches.Sum(b => b.Quantity);



        product.StockQuantity = total;

        product.UpdatedAt = DateTime.UtcNow;

        return total;

    }



    public static ProductBatch CreateLegacyBatch(Product product) =>

        new()

        {

            ProductId = product.Id,

            BatchCode = "LEGACY",

            CostPrice = product.CostPrice,

            SellingPrice = product.UnitPrice,

            ReceivedQuantity = product.StockQuantity,

            Quantity = product.StockQuantity,

            ReceivedDate = new DateOnly(2000, 1, 1),

            IsActive = true

        };



    public static ProductBatch CreateOpeningBatch(Product product) =>

        new()

        {

            ProductId = product.Id,

            BatchCode = "OPENING",

            CostPrice = product.CostPrice,

            SellingPrice = product.UnitPrice,

            ReceivedQuantity = product.StockQuantity,

            Quantity = product.StockQuantity,

            ReceivedDate = DateOnly.FromDateTime(DateTime.UtcNow),

            IsActive = true

        };

}


