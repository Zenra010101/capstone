using GensanPOS.Application.DTOs.Inventory;

namespace GensanPOS.Application.Interfaces;

public interface IInventoryAdjustmentExportService
{
    Task<byte[]> ExportExcelAsync(
        InventoryAdjustmentSearchQuery query,
        Guid userId,
        string role,
        bool includeFinancials,
        CancellationToken cancellationToken = default);

    Task<byte[]> ExportPdfAsync(
        InventoryAdjustmentSearchQuery query,
        Guid userId,
        string role,
        bool includeFinancials,
        CancellationToken cancellationToken = default);
}
