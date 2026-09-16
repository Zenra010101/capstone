using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Domain.Interfaces;

public interface IExpenseVoucherRepository : IRepository<ExpenseVoucher>
{
    Task<ExpenseVoucher?> GetByIdWithDetailsAsync(Guid id, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<ExpenseVoucher> Items, int TotalCount)> SearchPagedAsync(
        ExpenseVoucherSearchFilter filter,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ExpenseVoucher>> SearchAsync(
        ExpenseVoucherSearchFilter filter,
        CancellationToken cancellationToken = default);
    Task<string> GenerateVoucherNumberAsync(CancellationToken cancellationToken = default);
}

public record ExpenseVoucherSearchFilter(
    DateTime? From,
    DateTime? To,
    ExpenseVoucherStatus? Status,
    Guid? CategoryId,
    string? Search,
    Guid? CreatedByUserId);
