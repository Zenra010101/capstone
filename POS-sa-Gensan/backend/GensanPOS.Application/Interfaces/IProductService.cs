using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Products;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Application.Interfaces;

public interface IProductService
{
    Task<IReadOnlyList<ProductDto>> GetAllAsync(
        string? search,
        Guid? categoryId,
        Guid? supplierId,
        StockStatus? stockStatus,
        bool? lowStockOnly,
        bool activeOnly,
        bool includeFinancials,
        CancellationToken cancellationToken = default);

    Task<PagedResult<ProductDto>> GetPagedAsync(
        string? search,
        Guid? categoryId,
        Guid? supplierId,
        StockStatus? stockStatus,
        bool? lowStockOnly,
        bool activeOnly,
        bool includeFinancials,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<ProductSummaryDto> GetSummaryAsync(bool includeFinancials, CancellationToken cancellationToken = default);
    Task<ProductDto> GetByIdAsync(Guid id, bool includeFinancials, CancellationToken cancellationToken = default);
    Task<ProductDto> GetByBarcodeAsync(string barcode, bool includeFinancials, CancellationToken cancellationToken = default);
    Task<bool> IsBarcodeAvailableAsync(string barcode, Guid? excludeProductId, CancellationToken cancellationToken = default);
    Task<ProductDto> CreateAsync(CreateProductRequest request, Guid userId, CancellationToken cancellationToken = default);
    Task<ProductDto> UpdateAsync(Guid id, UpdateProductRequest request, Guid userId, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, Guid userId, CancellationToken cancellationToken = default);
    Task<GenerateBarcodeResponse> GenerateBarcodeAsync(Guid id, Guid userId, CancellationToken cancellationToken = default);
    Task<BulkGenerateBarcodeResultDto> GenerateMissingBarcodesAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProductMovementDto>> GetMovementsAsync(Guid productId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProductPriceHistoryDto>> GetPriceHistoryAsync(Guid productId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProductSaleHistoryDto>> GetProductSalesHistoryAsync(
        Guid productId,
        DateTime? from,
        DateTime? to,
        Guid userId,
        string role,
        bool includeFinancials,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProductReceivingHistoryDto>> GetProductReceivingHistoryAsync(
        Guid productId,
        DateTime? from,
        DateTime? to,
        Guid userId,
        string role,
        bool includeFinancials,
        CancellationToken cancellationToken = default);
    Task<byte[]> ExportProductSalesHistoryExcelAsync(
        Guid productId,
        DateTime? from,
        DateTime? to,
        Guid userId,
        string role,
        bool includeFinancials,
        CancellationToken cancellationToken = default);
    Task<byte[]> ExportProductReceivingHistoryExcelAsync(
        Guid productId,
        DateTime? from,
        DateTime? to,
        Guid userId,
        string role,
        bool includeFinancials,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<LstmForecastDto>> GetLstmForecastAsync(
        DateTime fromMonth,
        DateTime toMonth,
        Guid? categoryId,
        CancellationToken cancellationToken = default);
}
