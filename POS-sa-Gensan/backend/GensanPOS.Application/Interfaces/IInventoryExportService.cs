using GensanPOS.Application.DTOs.Inventory;

namespace GensanPOS.Application.Interfaces;

public interface IInventoryExportService
{
    Task<byte[]> ExportOnHandExcelAsync(
        string? search,
        Guid? categoryId,
        bool? lowStockOnly,
        bool includeFinancials,
        CancellationToken cancellationToken = default);

    Task<byte[]> ExportOnHandPdfAsync(
        string? search,
        Guid? categoryId,
        bool? lowStockOnly,
        bool includeFinancials,
        CancellationToken cancellationToken = default);

    Task<byte[]> ExportMovementsExcelAsync(InventorySearchQuery query, CancellationToken cancellationToken = default);

    Task<byte[]> ExportMovementsPdfAsync(InventorySearchQuery query, CancellationToken cancellationToken = default);

    Task<byte[]> ExportStockListExcelAsync(
        string? search,
        Guid? categoryId,
        bool? lowStockOnly,
        CancellationToken cancellationToken = default);

    Task<byte[]> ExportStockListPdfAsync(
        string? search,
        Guid? categoryId,
        bool? lowStockOnly,
        CancellationToken cancellationToken = default);
}
