using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Interfaces;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Repositories;

public class ExpenseVoucherRepository : Repository<ExpenseVoucher>, IExpenseVoucherRepository
{
    public ExpenseVoucherRepository(AppDbContext context) : base(context) { }

    public async Task<ExpenseVoucher?> GetByIdWithDetailsAsync(Guid id, CancellationToken cancellationToken = default) =>
        await DbSet
            .Include(v => v.Category)
            .Include(v => v.CreatedByUser)
            .Include(v => v.PaidByUser)
            .Include(v => v.Attachments).ThenInclude(a => a.UploadedByUser)
            .FirstOrDefaultAsync(v => v.Id == id, cancellationToken);

    public async Task<(IReadOnlyList<ExpenseVoucher> Items, int TotalCount)> SearchPagedAsync(
        ExpenseVoucherSearchFilter filter,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = BuildQuery(filter);
        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(v => v.ExpenseDate)
            .ThenByDescending(v => v.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
        return (items, total);
    }

    public async Task<IReadOnlyList<ExpenseVoucher>> SearchAsync(
        ExpenseVoucherSearchFilter filter,
        CancellationToken cancellationToken = default) =>
        await BuildQuery(filter)
            .OrderByDescending(v => v.ExpenseDate)
            .ThenByDescending(v => v.CreatedAt)
            .ToListAsync(cancellationToken);

    public async Task<string> GenerateVoucherNumberAsync(CancellationToken cancellationToken = default)
    {
        var today = DateTime.UtcNow.ToString("yyyyMMdd");
        var prefix = $"EXP{today}";
        var count = await DbSet.CountAsync(v => v.VoucherNumber.StartsWith(prefix), cancellationToken);
        return $"{prefix}-{(count + 1):D4}";
    }

    private IQueryable<ExpenseVoucher> BuildQuery(ExpenseVoucherSearchFilter filter)
    {
        var query = DbSet
            .Include(v => v.Category)
            .AsQueryable();

        if (filter.From.HasValue)
        {
            var from = DateOnly.FromDateTime(filter.From.Value.Date);
            query = query.Where(v => v.ExpenseDate >= from);
        }

        if (filter.To.HasValue)
        {
            var to = DateOnly.FromDateTime(filter.To.Value.Date);
            query = query.Where(v => v.ExpenseDate <= to);
        }

        if (filter.Status.HasValue)
            query = query.Where(v => v.Status == filter.Status.Value);

        if (filter.CategoryId.HasValue)
            query = query.Where(v => v.CategoryId == filter.CategoryId.Value);

        if (filter.CreatedByUserId.HasValue)
            query = query.Where(v => v.CreatedByUserId == filter.CreatedByUserId.Value);

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim();
            query = query.Where(v =>
                v.VoucherNumber.Contains(term) ||
                v.Payee.Contains(term) ||
                v.Particulars.Contains(term) ||
                (v.ReferenceNumber != null && v.ReferenceNumber.Contains(term)));
        }

        return query;
    }
}
