using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Inventory;

namespace GensanPOS.Application.Interfaces;

public interface IInventoryService
{
    Task<InventorySummaryDto> GetSummaryAsync(bool includeFinancials, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<InventoryOnHandDto>> GetOnHandAsync(
        string? search,
        Guid? categoryId,
        Guid? productId,
        bool? lowStockOnly,
        bool includeFinancials,
        CancellationToken cancellationToken = default);
    Task<PagedResult<InventoryOnHandDto>> GetOnHandPagedAsync(
        string? search,
        Guid? categoryId,
        Guid? productId,
        bool? lowStockOnly,
        bool includeFinancials,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<InventoryTransactionDto> AdjustAsync(AdjustInventoryRequest request, Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<InventoryTransactionDto>> GetTransactionsAsync(Guid? productId, CancellationToken cancellationToken = default);
    Task<PagedResult<InventoryTransactionDto>> GetTransactionsPagedAsync(InventorySearchQuery query, CancellationToken cancellationToken = default);

    Task<InventoryStockListReportDto> GetStockListReportAsync(
        string? search,
        Guid? categoryId,
        bool? lowStockOnly,
        CancellationToken cancellationToken = default);
}
