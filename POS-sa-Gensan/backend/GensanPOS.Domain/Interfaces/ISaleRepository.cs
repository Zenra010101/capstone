using GensanPOS.Domain.Entities;

namespace GensanPOS.Domain.Interfaces;

public interface ISaleRepository : IRepository<Sale>
{
    Task<Sale?> GetByIdWithDetailsAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Sale?> GetBySaleNumberAsync(string saleNumber, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Sale>> GetSalesAsync(DateTime? from, DateTime? to, Guid? filterByUserId = null, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Sale>> GetSalesHistoryAsync(DateTime? from, DateTime? to, Guid? filterByUserId = null, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<Sale> Items, int TotalCount, decimal TotalAmount, int CompletedCount, int VoidedCount)>
        GetSalesHistoryPagedAsync(
            DateTime? from,
            DateTime? to,
            Guid? filterByUserId,
            Guid? cashierId,
            int? paymentMethod,
            int? status,
            string? search,
            int page,
            int pageSize,
            bool includeArchived,
            CancellationToken cancellationToken = default);
    Task<string> GenerateSaleNumberAsync(CancellationToken cancellationToken = default);
}
