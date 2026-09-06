using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Domain.Interfaces;

public interface IChequeRepository
{
    Task<SaleCheque?> GetByIdWithSaleAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SaleCheque>> GetListAsync(ChequeStatus? status, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<SaleCheque> Items, int TotalCount)> GetPagedAsync(
        ChequeStatus? status,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);
    Task<int> CountPendingAsync(CancellationToken cancellationToken = default);
    Task AddAsync(SaleCheque cheque, CancellationToken cancellationToken = default);
    Task UpdateAsync(SaleCheque cheque, CancellationToken cancellationToken = default);
}
