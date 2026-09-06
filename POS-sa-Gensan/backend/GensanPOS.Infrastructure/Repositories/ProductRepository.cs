using GensanPOS.Domain.Constants;
using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;
using GensanPOS.Domain.Helpers;
using GensanPOS.Domain.Interfaces;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Repositories;

public class ProductRepository : Repository<Product>, IProductRepository
{
    public ProductRepository(AppDbContext context) : base(context) { }

    public async Task<Product?> GetBySkuAsync(string sku, CancellationToken cancellationToken = default) =>
        await DbSet.Include(p => p.Category).Include(p => p.Supplier)
            .FirstOrDefaultAsync(p => p.Sku.ToLower() == sku.ToLower(), cancellationToken);

    public async Task<Product?> GetByBarcodeAsync(string barcode, CancellationToken cancellationToken = default)
    {
        var code = BarcodeNormalizer.Normalize(barcode);
        if (code.Length == 0) return null;

        return await DbSet.Include(p => p.Category).Include(p => p.Supplier)
            .FirstOrDefaultAsync(
                p => p.IsActive && p.Barcode != null && p.Barcode.ToLower() == code.ToLower(),
                cancellationToken);
    }

    public async Task<Product?> GetByBarcodeExcludingAsync(string barcode, Guid excludeId, CancellationToken cancellationToken = default) =>
        await DbSet.FirstOrDefaultAsync(
            p => p.Barcode == barcode && p.Id != excludeId && p.IsActive,
            cancellationToken);

    public async Task<Product?> FindActiveDuplicateAsync(
        ProductDuplicateKey key,
        Guid? excludeId = null,
        CancellationToken cancellationToken = default)
    {
        var query = DbSet.Include(p => p.Category).Include(p => p.Supplier)
            .Where(p =>
                p.IsActive &&
                p.CategoryId == key.CategoryId &&
                p.Name.ToLower() == key.Name.ToLower() &&
                p.UnitOfMeasure.ToLower() == key.UnitOfMeasure.ToLower() &&
                (p.Size ?? "").ToLower() == (key.Size ?? "").ToLower() &&
                (p.Thickness ?? "").ToLower() == (key.Thickness ?? "").ToLower() &&
                (p.Length ?? "").ToLower() == (key.Length ?? "").ToLower() &&
                (p.Grade ?? "").ToLower() == (key.Grade ?? "").ToLower() &&
                (p.Diameter ?? "").ToLower() == (key.Diameter ?? "").ToLower() &&
                (p.Schedule ?? "").ToLower() == (key.Schedule ?? "").ToLower() &&
                (p.Width ?? "").ToLower() == (key.Width ?? "").ToLower() &&
                (p.Height ?? "").ToLower() == (key.Height ?? "").ToLower() &&
                (p.MaterialType ?? "").ToLower() == (key.MaterialType ?? "").ToLower());

        if (excludeId.HasValue)
            query = query.Where(p => p.Id != excludeId.Value);

        return await query.FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<Product?> GetByIdWithCategoryAsync(Guid id, CancellationToken cancellationToken = default) =>
        await DbSet.Include(p => p.Category).Include(p => p.Supplier)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Product>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken cancellationToken = default)
    {
        var idList = ids.Distinct().ToList();
        if (idList.Count == 0)
            return [];
        return await DbSet.Where(p => idList.Contains(p.Id)).ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Product>> SearchAsync(
        string? search,
        Guid? categoryId,
        Guid? supplierId,
        StockStatus? stockStatus,
        bool? lowStockOnly,
        bool activeOnly,
        CancellationToken cancellationToken = default)
    {
        var query = BuildSearchQuery(search, categoryId, supplierId, stockStatus, lowStockOnly, activeOnly);
        return await query.OrderBy(p => p.Name).AsNoTracking().ToListAsync(cancellationToken);
    }

    public async Task<(IReadOnlyList<Product> Items, int TotalCount)> SearchPagedAsync(
        string? search,
        Guid? categoryId,
        Guid? supplierId,
        StockStatus? stockStatus,
        bool? lowStockOnly,
        bool activeOnly,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = BuildSearchQuery(search, categoryId, supplierId, stockStatus, lowStockOnly, activeOnly);
        var totalCount = await query.CountAsync(cancellationToken);

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 500);

        var items = await query
            .OrderBy(p => p.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task<ProductSummaryCounts> GetSummaryCountsAsync(CancellationToken cancellationToken = default)
    {
        var low = InventoryConstants.LowStockThreshold;
        var critical = InventoryConstants.CriticalStockThreshold;

        var totalProducts = await DbSet.CountAsync(cancellationToken);
        var activeQuery = DbSet.AsNoTracking().Where(p => p.IsActive);

        var activeProducts = await activeQuery.CountAsync(cancellationToken);
        var totalUnits = await activeQuery.SumAsync(p => (int?)p.StockQuantity, cancellationToken) ?? 0;
        var lowStockCount = await activeQuery.CountAsync(
            p => p.StockQuantity > critical && p.StockQuantity <= low, cancellationToken);
        var criticalStockCount = await activeQuery.CountAsync(
            p => p.StockQuantity > 0 && p.StockQuantity <= critical, cancellationToken);
        var outOfStockCount = await activeQuery.CountAsync(p => p.StockQuantity <= 0, cancellationToken);
        var missingBarcodeCount = await activeQuery.CountAsync(
            p => p.Barcode == null || p.Barcode == "", cancellationToken);
        var totalInventoryValue = await activeQuery.SumAsync(
            p => (decimal?)(p.CostPrice * p.StockQuantity), cancellationToken) ?? 0;

        return new ProductSummaryCounts(
            TotalProducts: totalProducts,
            ActiveProducts: activeProducts,
            LowStockCount: lowStockCount,
            CriticalStockCount: criticalStockCount,
            OutOfStockCount: outOfStockCount,
            MissingBarcodeCount: missingBarcodeCount,
            TotalInventoryValue: totalInventoryValue);
    }

    private IQueryable<Product> BuildSearchQuery(
        string? search,
        Guid? categoryId,
        Guid? supplierId,
        StockStatus? stockStatus,
        bool? lowStockOnly,
        bool activeOnly)
    {
        var query = DbSet.Include(p => p.Category).Include(p => p.Supplier).AsQueryable();

        if (activeOnly)
            query = query.Where(p => p.IsActive);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLower();
            query = query.Where(p =>
                p.Name.ToLower().Contains(term) ||
                p.Sku.ToLower().Contains(term) ||
                (p.Barcode != null && p.Barcode.ToLower().Contains(term)) ||
                (p.Grade != null && p.Grade.ToLower().Contains(term)) ||
                (p.Size != null && p.Size.ToLower().Contains(term)) ||
                (p.Thickness != null && p.Thickness.ToLower().Contains(term)) ||
                (p.Length != null && p.Length.ToLower().Contains(term)) ||
                (p.Schedule != null && p.Schedule.ToLower().Contains(term)) ||
                (p.Diameter != null && p.Diameter.ToLower().Contains(term)) ||
                (p.MaterialType != null && p.MaterialType.ToLower().Contains(term)) ||
                (p.Description != null && p.Description.ToLower().Contains(term)));
        }

        if (categoryId.HasValue)
            query = query.Where(p => p.CategoryId == categoryId.Value);

        if (supplierId.HasValue)
            query = query.Where(p => p.SupplierId == supplierId.Value);

        if (lowStockOnly == true)
            query = query.Where(p => p.StockQuantity > 0 && p.StockQuantity <= InventoryConstants.LowStockThreshold);

        if (stockStatus.HasValue)
        {
            query = stockStatus.Value switch
            {
                StockStatus.OutOfStock => query.Where(p => p.StockQuantity <= 0),
                StockStatus.Critical => query.Where(p => p.StockQuantity > 0 && p.StockQuantity <= InventoryConstants.CriticalStockThreshold),
                StockStatus.LowStock => query.Where(p => p.StockQuantity > InventoryConstants.CriticalStockThreshold && p.StockQuantity <= InventoryConstants.LowStockThreshold),
                StockStatus.InStock => query.Where(p => p.StockQuantity > InventoryConstants.LowStockThreshold),
                _ => query
            };
        }

        return query;
    }
}
