using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Domain.Interfaces;

public interface IGoodsReturnSlipRepository : IRepository<GoodsReturnSlip>
{
    Task<GoodsReturnSlip?> GetByIdWithDetailsAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<GoodsReturnSlip>> GetListAsync(Guid? filterByUserId, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<GoodsReturnSlip> Items, int TotalCount)> GetListPagedAsync(
        Guid? filterByUserId,
        DateTime? from,
        DateTime? to,
        Guid? processedByUserId,
        string? customerSearch,
        string? invoiceSearch,
        GrsStatus? status,
        int page,
        int pageSize,
        bool includeArchived,
        CancellationToken cancellationToken = default);
    Task<string> GenerateGrsNumberAsync(CancellationToken cancellationToken = default);
    Task<decimal> GetReturnsTotalForDateAsync(DateTime date, CancellationToken cancellationToken = default);
}
