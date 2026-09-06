using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;
using GensanPOS.Domain.Interfaces;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Repositories;

public class GoodsReturnSlipRepository : Repository<GoodsReturnSlip>, IGoodsReturnSlipRepository
{
    public GoodsReturnSlipRepository(AppDbContext context) : base(context) { }

    public async Task<GoodsReturnSlip?> GetByIdWithDetailsAsync(Guid id, CancellationToken cancellationToken = default) =>
        await DbSet
            .Include(g => g.OriginalSale)
            .ThenInclude(s => s!.User)
            .Include(g => g.ProcessedByUser)
            .Include(g => g.VoidedByUser)
            .Include(g => g.Items)
            .ThenInclude(i => i.Product)
            .Include(g => g.SalesDeduction)
            .Include(g => g.GoodsExchange)
            .ThenInclude(e => e!.Lines)
            .Include(g => g.GoodsExchange)
            .ThenInclude(e => e!.TopUpSale)
            .FirstOrDefaultAsync(g => g.Id == id, cancellationToken);

    public async Task<IReadOnlyList<GoodsReturnSlip>> GetListAsync(Guid? filterByUserId, CancellationToken cancellationToken = default)
    {
        var query = BaseListQuery(filterByUserId);
        return await query.OrderByDescending(g => g.CreatedAt).AsNoTracking().ToListAsync(cancellationToken);
    }

    public async Task<(IReadOnlyList<GoodsReturnSlip> Items, int TotalCount)> GetListPagedAsync(
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
        CancellationToken cancellationToken = default)
    {
        var query = BaseListQuery(filterByUserId).AsNoTracking();

        if (!includeArchived)
            query = query.Where(g => !g.IsArchived);
        if (from.HasValue)
            query = query.Where(g => g.ReturnDate >= from.Value.Date);
        if (to.HasValue)
            query = query.Where(g => g.ReturnDate < to.Value.Date.AddDays(1));
        if (processedByUserId.HasValue)
            query = query.Where(g => g.ProcessedByUserId == processedByUserId.Value);
        if (status.HasValue)
            query = query.Where(g => g.Status == status.Value);
        if (!string.IsNullOrWhiteSpace(customerSearch))
        {
            var term = customerSearch.Trim().ToLower();
            query = query.Where(g => g.CustomerName != null && g.CustomerName.ToLower().Contains(term));
        }
        if (!string.IsNullOrWhiteSpace(invoiceSearch))
        {
            var inv = invoiceSearch.Trim().ToLower();
            query = query.Where(g => g.OriginalInvoiceNumber.ToLower().Contains(inv));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(g => g.ReturnDate)
            .ThenByDescending(g => g.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, total);
    }

    private IQueryable<GoodsReturnSlip> BaseListQuery(Guid? filterByUserId)
    {
        var query = DbSet
            .Include(g => g.OriginalSale)
            .ThenInclude(s => s!.User)
            .Include(g => g.ProcessedByUser)
            .Include(g => g.VoidedByUser)
            .Include(g => g.Items)
            .AsQueryable();

        if (filterByUserId.HasValue)
            query = query.Where(g => g.ProcessedByUserId == filterByUserId.Value);

        return query;
    }

    public async Task<string> GenerateGrsNumberAsync(CancellationToken cancellationToken = default)
    {
        var today = DateTime.UtcNow.ToString("yyyyMMdd");
        var prefix = $"GRS{today}";
        var count = await DbSet.CountAsync(g => g.GrsNumber.StartsWith(prefix), cancellationToken);
        return $"{prefix}-{(count + 1):D4}";
    }

    public async Task<decimal> GetReturnsTotalForDateAsync(DateTime date, CancellationToken cancellationToken = default)
    {
        var start = date.Date;
        var end = start.AddDays(1);
        return await DbSet
            .Where(g => g.Status == GrsStatus.Completed && !g.IsArchived
                && g.ReturnDate >= start && g.ReturnDate < end)
            .SumAsync(g => g.TotalReturnAmount, cancellationToken);
    }
}
