using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Domain.Interfaces;

public interface IStockReceivingRepository : IRepository<StockReceiving>
{
    Task<StockReceiving?> GetByIdWithDetailsAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<StockReceiving>> SearchAsync(
        StockReceivingSearchFilter filter,
        CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<StockReceiving> Items, int TotalCount)> SearchPagedAsync(
        StockReceivingSearchFilter filter,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);
    Task<string> GenerateReceivingNumberAsync(CancellationToken cancellationToken = default);
    Task<int> CountPendingAsync(CancellationToken cancellationToken = default);
    Task<bool> ReferenceNumberExistsAsync(string referenceNumber, Guid? excludeId, CancellationToken cancellationToken = default);
    Task<bool> DeliveryReceiptNumberExistsAsync(string deliveryReceiptNumber, Guid? excludeId, CancellationToken cancellationToken = default);
    Task<StockReceivingSummaryCounts> GetSummaryCountsAsync(CancellationToken cancellationToken = default);
}

public record StockReceivingSearchFilter(
    StockReceivingStatus? Status,
    Guid? SupplierId,
    Guid? RequestedByUserId,
    DateTime? From,
    DateTime? To,
    string? ReferenceNumber,
    string? Search,
    Guid? ProductId = null);

public record StockReceivingSummaryCounts(
    int PendingCount,
    int ApprovedTodayCount,
    int RejectedCount,
    int TotalIncomingUnits,
    decimal TotalReceivingCost);
