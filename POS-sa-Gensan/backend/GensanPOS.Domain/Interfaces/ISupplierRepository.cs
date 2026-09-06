using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Domain.Interfaces;

public interface ISupplierRepository : IRepository<Supplier>
{
    Task<Supplier?> GetByNameAsync(string name, Guid? excludeId, CancellationToken cancellationToken = default);
    Task<Supplier?> GetByIdWithDetailsAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Supplier>> SearchAsync(SupplierSearchFilter filter, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<Supplier> Items, int TotalCount)> SearchPagedAsync(
        SupplierSearchFilter filter,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);
    Task<bool> HasReceivingHistoryAsync(Guid supplierId, CancellationToken cancellationToken = default);
    Task<SupplierListMetrics> GetListMetricsAsync(Guid supplierId, CancellationToken cancellationToken = default);
    Task<IReadOnlyDictionary<Guid, SupplierListMetrics>> GetListMetricsBatchAsync(
        IReadOnlyList<Guid> supplierIds,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SupplierSpendRow>> GetSpendRankingsAsync(int top, CancellationToken cancellationToken = default);
    Task<string> GenerateSupplierCodeAsync(CancellationToken cancellationToken = default);
}

public record SupplierSearchFilter(
    string? Search,
    SupplierStatus? Status,
    bool? PreferredOnly,
    bool? ActiveOnly,
    Guid? ProductId,
    bool IncludeArchived);

public record SupplierListMetrics(
    int SuppliedProductCount,
    DateTime? LastReceivingDate,
    decimal ApprovedPurchaseValue,
    int TotalReceivings,
    int ApprovedReceivings,
    int RejectedReceivings,
    int PartialDeliveries);

public record SupplierSpendRow(Guid SupplierId, string SupplierName, decimal TotalSpend, int ReceivingCount);
