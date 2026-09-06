using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Domain.Interfaces;

public interface IInventoryAdjustmentRepository : IRepository<InventoryAdjustmentRequest>
{
    Task<InventoryAdjustmentRequest?> GetByIdWithDetailsAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<InventoryAdjustmentRequest>> SearchAsync(
        AdjustmentRequestStatus? status,
        Guid? productId,
        Guid? requestedByUserId,
        DateTime? from,
        DateTime? to,
        string? search,
        CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<InventoryAdjustmentRequest> Items, int TotalCount)> SearchPagedAsync(
        AdjustmentRequestStatus? status,
        Guid? productId,
        Guid? requestedByUserId,
        DateTime? from,
        DateTime? to,
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);
    Task<int> CountPendingAsync(CancellationToken cancellationToken = default);
    Task<(int Pending, int Approved, int Rejected, int NetPendingDiff)> GetSummaryCountsAsync(CancellationToken cancellationToken = default);
}
