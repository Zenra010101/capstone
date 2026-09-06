using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Domain.Interfaces;

public interface IReceivableRepository : IRepository<CustomerReceivable>
{
    Task<CustomerReceivable?> GetByIdWithDetailsAsync(Guid id, CancellationToken cancellationToken = default);
    Task<CustomerReceivable?> GetBySaleIdAsync(Guid saleId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CustomerReceivable>> GetListAsync(
        Guid? filterBySaleUserId,
        Guid? customerId,
        string? customerSearch,
        DateTime? from,
        DateTime? to,
        bool includeArchived,
        ReceivableStatus? status,
        bool? overdueOnly,
        bool? openOnly,
        CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<CustomerReceivable> Items, int TotalCount)> GetListPagedAsync(
        Guid? filterBySaleUserId,
        Guid? customerId,
        string? customerSearch,
        DateTime? from,
        DateTime? to,
        bool includeArchived,
        ReceivableStatus? status,
        bool? overdueOnly,
        bool? openOnly,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);
    Task<decimal> GetTotalOutstandingAsync(Guid? filterBySaleUserId, CancellationToken cancellationToken = default);
    Task<int> CountOverdueAsync(Guid? filterBySaleUserId, CancellationToken cancellationToken = default);
    Task<decimal> GetCollectedTodayAsync(Guid? filterBySaleUserId, CancellationToken cancellationToken = default);
}
