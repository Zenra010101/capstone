using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;
using GensanPOS.Domain.Interfaces;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Repositories;

public class ReceivableRepository : Repository<CustomerReceivable>, IReceivableRepository
{
    public ReceivableRepository(AppDbContext context) : base(context) { }

    public async Task<CustomerReceivable?> GetByIdWithDetailsAsync(Guid id, CancellationToken cancellationToken = default) =>
        await DbSet
            .Include(r => r.Sale)
            .ThenInclude(s => s!.User)
            .Include(r => r.Sale)
            .ThenInclude(s => s!.Cheque)
            .Include(r => r.Customer)
            .Include(r => r.Payments)
            .ThenInclude(p => p.RecordedByUser)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

    public async Task<CustomerReceivable?> GetBySaleIdAsync(Guid saleId, CancellationToken cancellationToken = default) =>
        await DbSet
            .Include(r => r.Payments)
            .FirstOrDefaultAsync(r => r.SaleId == saleId, cancellationToken);

    public async Task<IReadOnlyList<CustomerReceivable>> GetListAsync(
        Guid? filterBySaleUserId,
        Guid? customerId,
        string? customerSearch,
        DateTime? from,
        DateTime? to,
        bool includeArchived,
        ReceivableStatus? status,
        bool? overdueOnly,
        bool? openOnly,
        CancellationToken cancellationToken = default)
    {
        var query = BuildListQuery(filterBySaleUserId, customerId, customerSearch, from, to, includeArchived, status, overdueOnly, openOnly);
        return await query.OrderByDescending(r => r.DueDate).AsNoTracking().ToListAsync(cancellationToken);
    }

    public async Task<(IReadOnlyList<CustomerReceivable> Items, int TotalCount)> GetListPagedAsync(
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
        CancellationToken cancellationToken = default)
    {
        var query = BuildListQuery(filterBySaleUserId, customerId, customerSearch, from, to, includeArchived, status, overdueOnly, openOnly);
        var totalCount = await query.CountAsync(cancellationToken);

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 10, 200);

        var items = await query
            .OrderByDescending(r => r.DueDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    private IQueryable<CustomerReceivable> BuildListQuery(
        Guid? filterBySaleUserId,
        Guid? customerId,
        string? customerSearch,
        DateTime? from,
        DateTime? to,
        bool includeArchived,
        ReceivableStatus? status,
        bool? overdueOnly,
        bool? openOnly)
    {
        var query = DbSet
            .Include(r => r.Sale)
            .ThenInclude(s => s!.User)
            .Include(r => r.Customer)
            .Include(r => r.Payments)
            .ThenInclude(p => p.RecordedByUser)
            .AsQueryable();

        if (!includeArchived)
            query = query.Where(r => !r.IsArchived);
        if (filterBySaleUserId.HasValue)
            query = query.Where(r => r.Sale != null && r.Sale.UserId == filterBySaleUserId.Value);
        if (customerId.HasValue)
            query = query.Where(r => r.CustomerId == customerId.Value);
        if (!string.IsNullOrWhiteSpace(customerSearch))
        {
            var term = customerSearch.Trim().ToLower();
            query = query.Where(r =>
                r.CustomerName.ToLower().Contains(term) ||
                (r.Customer != null && r.Customer.Name.ToLower().Contains(term)));
        }
        if (from.HasValue)
            query = query.Where(r => r.CreatedAt >= from.Value.Date);
        if (to.HasValue)
            query = query.Where(r => r.CreatedAt < to.Value.Date.AddDays(1));

        if (openOnly == true)
            query = query.Where(r => r.RemainingBalance > 0);

        if (overdueOnly == true)
        {
            var today = DateTime.UtcNow.Date;
            query = query.Where(r => r.RemainingBalance > 0 && r.DueDate.Date < today);
        }
        else if (status.HasValue)
            query = query.Where(r => r.Status == status.Value);

        return query;
    }

    public Task<decimal> GetTotalOutstandingAsync(Guid? filterBySaleUserId, CancellationToken cancellationToken = default)
    {
        var q = DbSet.Where(r => r.RemainingBalance > 0 && !r.IsArchived);
        if (filterBySaleUserId.HasValue)
            q = q.Where(r => r.Sale != null && r.Sale.UserId == filterBySaleUserId.Value);
        return q.SumAsync(r => r.RemainingBalance, cancellationToken);
    }

    public Task<int> CountOverdueAsync(Guid? filterBySaleUserId, CancellationToken cancellationToken = default)
    {
        var today = DateTime.UtcNow.Date;
        var q = DbSet.Where(r => r.RemainingBalance > 0 && !r.IsArchived && r.DueDate.Date < today);
        if (filterBySaleUserId.HasValue)
            q = q.Where(r => r.Sale != null && r.Sale.UserId == filterBySaleUserId.Value);
        return q.CountAsync(cancellationToken);
    }

    public async Task<decimal> GetCollectedTodayAsync(Guid? filterBySaleUserId, CancellationToken cancellationToken = default)
    {
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);
        var q = Context.ReceivablePayments.AsNoTracking()
            .Include(p => p.CustomerReceivable)
            .ThenInclude(r => r.Sale)
            .Where(p => !p.IsCredit && !p.IsChequePending && !p.IsVoided
                && p.PaymentDate >= today && p.PaymentDate < tomorrow);

        if (filterBySaleUserId.HasValue)
            q = q.Where(p => p.CustomerReceivable.Sale!.UserId == filterBySaleUserId.Value);

        return await q.SumAsync(p => (decimal?)p.Amount, cancellationToken) ?? 0;
    }
}
