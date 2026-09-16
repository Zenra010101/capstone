using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;
using GensanPOS.Domain.Interfaces;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Repositories;

public class SaleRepository : Repository<Sale>, ISaleRepository
{
    public SaleRepository(AppDbContext context) : base(context) { }

    public async Task<Sale?> GetByIdWithDetailsAsync(Guid id, CancellationToken cancellationToken = default) =>
        await DbSet
            .Include(s => s.User)
            .Include(s => s.Items).ThenInclude(i => i.ProductBatch)
            .Include(s => s.Payment)
            .Include(s => s.VoidedByUser)
            .Include(s => s.ReplacesSale)
            .Include(s => s.ReplacedBySale)
            .Include(s => s.Receivable)
            .Include(s => s.Cheque)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

    public async Task<Sale?> GetBySaleNumberAsync(string saleNumber, CancellationToken cancellationToken = default) =>
        await DbSet
            .Include(s => s.User)
            .Include(s => s.Items).ThenInclude(i => i.ProductBatch)
            .Include(s => s.Payment)
            .Include(s => s.Receivable)
            .FirstOrDefaultAsync(s => s.SaleNumber == saleNumber, cancellationToken);

    public async Task<IReadOnlyList<Sale>> GetSalesHistoryAsync(
        DateTime? from,
        DateTime? to,
        Guid? filterByUserId = null,
        CancellationToken cancellationToken = default)
    {
        var query = DbSet
            .Include(s => s.User)
            .Include(s => s.Items).ThenInclude(i => i.ProductBatch)
            .Include(s => s.Payment)
            .Include(s => s.VoidedByUser)
            .Include(s => s.ReplacesSale)
            .Include(s => s.ReplacedBySale)
            .AsQueryable();

        if (filterByUserId.HasValue)
            query = query.Where(s => s.UserId == filterByUserId.Value);

        if (from.HasValue)
            query = query.Where(s => s.CreatedAt >= from.Value);
        if (to.HasValue)
            query = query.Where(s => s.CreatedAt < to.Value);

        return await query.OrderByDescending(s => s.CreatedAt).AsNoTracking().ToListAsync(cancellationToken);
    }

    public async Task<(IReadOnlyList<Sale> Items, int TotalCount, decimal TotalAmount, int CompletedCount, int VoidedCount)>
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
            CancellationToken cancellationToken = default)
    {
        var query = BuildHistoryQuery(
            from, to, filterByUserId, cashierId, paymentMethod, status, search, includeArchived);

        var total = await query.CountAsync(cancellationToken);
        var totalAmount = await query.SumAsync(s => s.TotalAmount, cancellationToken);
        var completedCount = await query.CountAsync(s => s.Status == SaleStatus.Completed, cancellationToken);
        var voidedCount = await query.CountAsync(s => s.Status == SaleStatus.Voided, cancellationToken);

        var items = await query
            .OrderByDescending(s => s.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, total, totalAmount, completedCount, voidedCount);
    }

    private IQueryable<Sale> BuildHistoryQuery(
        DateTime? from,
        DateTime? to,
        Guid? filterByUserId,
        Guid? cashierId,
        int? paymentMethod,
        int? status,
        string? search,
        bool includeArchived)
    {
        var query = DbSet
            .Include(s => s.User)
            .Include(s => s.Payment)
            .AsNoTracking()
            .AsQueryable();

        if (filterByUserId.HasValue)
            query = query.Where(s => s.UserId == filterByUserId.Value);
        else if (cashierId.HasValue)
            query = query.Where(s => s.UserId == cashierId.Value);

        if (!includeArchived)
            query = query.Where(s => !s.IsArchived);
        if (from.HasValue)
            query = query.Where(s => s.CreatedAt >= from.Value);
        if (to.HasValue)
            query = query.Where(s => s.CreatedAt < to.Value);
        if (paymentMethod.HasValue)
            query = query.Where(s => (int)s.PaymentMethod == paymentMethod.Value);
        if (status.HasValue)
            query = query.Where(s => (int)s.Status == status.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(s => s.SaleNumber.Contains(term));
        }

        return query;
    }

    public async Task<IReadOnlyList<Sale>> GetSalesAsync(
        DateTime? from,
        DateTime? to,
        Guid? filterByUserId = null,
        CancellationToken cancellationToken = default)
    {
        var query = DbSet
            .Include(s => s.User)
            .Include(s => s.Items).ThenInclude(i => i.ProductBatch)
            .Include(s => s.Payment)
            .Where(s => s.Status == SaleStatus.Completed)
            .AsQueryable();

        if (filterByUserId.HasValue)
            query = query.Where(s => s.UserId == filterByUserId.Value);

        if (from.HasValue)
            query = query.Where(s => s.CreatedAt >= from.Value);
        if (to.HasValue)
            query = query.Where(s => s.CreatedAt < to.Value);

        return await query.OrderByDescending(s => s.CreatedAt).AsNoTracking().ToListAsync(cancellationToken);
    }

    public async Task<string> GenerateSaleNumberAsync(CancellationToken cancellationToken = default)
    {
        var today = DateTime.UtcNow.ToString("yyyyMMdd");
        var prefix = $"S{today}";
        var count = await DbSet.CountAsync(s => s.SaleNumber.StartsWith(prefix), cancellationToken);
        return $"{prefix}-{(count + 1):D4}";
    }
}
