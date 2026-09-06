using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Domain.Interfaces;

public interface IProductRepository : IRepository<Product>
{
    Task<Product?> GetBySkuAsync(string sku, CancellationToken cancellationToken = default);
    Task<Product?> GetByBarcodeAsync(string barcode, CancellationToken cancellationToken = default);
    Task<Product?> GetByBarcodeExcludingAsync(string barcode, Guid excludeId, CancellationToken cancellationToken = default);
    Task<Product?> FindActiveDuplicateAsync(
        ProductDuplicateKey key,
        Guid? excludeId = null,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Product>> SearchAsync(
        string? search,
        Guid? categoryId,
        Guid? supplierId,
        StockStatus? stockStatus,
        bool? lowStockOnly,
        bool activeOnly,
        CancellationToken cancellationToken = default);

    Task<(IReadOnlyList<Product> Items, int TotalCount)> SearchPagedAsync(
        string? search,
        Guid? categoryId,
        Guid? supplierId,
        StockStatus? stockStatus,
        bool? lowStockOnly,
        bool activeOnly,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<Product?> GetByIdWithCategoryAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Product>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken cancellationToken = default);
    Task<ProductSummaryCounts> GetSummaryCountsAsync(CancellationToken cancellationToken = default);
}

public record ProductSummaryCounts(
    int TotalProducts,
    int ActiveProducts,
    int LowStockCount,
    int CriticalStockCount,
    int OutOfStockCount,
    int MissingBarcodeCount,
    decimal TotalInventoryValue);

public record ProductDuplicateKey(
    string Name,
    Guid CategoryId,
    string UnitOfMeasure,
    string? Size,
    string? Thickness,
    string? Length,
    string? Grade,
    string? Diameter,
    string? Schedule,
    string? Width,
    string? Height,
    string? MaterialType);
