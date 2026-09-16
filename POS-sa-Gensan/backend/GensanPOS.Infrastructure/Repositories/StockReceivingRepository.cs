using GensanPOS.Domain.Entities;

using GensanPOS.Domain.Enums;

using GensanPOS.Domain.Interfaces;

using GensanPOS.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;



namespace GensanPOS.Infrastructure.Repositories;



public class StockReceivingRepository : Repository<StockReceiving>, IStockReceivingRepository

{

    public StockReceivingRepository(AppDbContext context) : base(context) { }



    public async Task<StockReceiving?> GetByIdWithDetailsAsync(Guid id, CancellationToken cancellationToken = default) =>

        await DbSet

            .Include(r => r.Supplier)

            .Include(r => r.RequestedByUser)

            .Include(r => r.ReviewedByUser)

            .Include(r => r.Items).ThenInclude(i => i.Product)

            .Include(r => r.Attachments).ThenInclude(a => a.UploadedByUser)

            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);



    public async Task<IReadOnlyList<StockReceiving>> SearchAsync(

        StockReceivingSearchFilter filter,

        CancellationToken cancellationToken = default)

    {

        var query = BuildSearchQuery(filter);

        return await query.OrderByDescending(r => r.CreatedAt).AsNoTracking().ToListAsync(cancellationToken);

    }



    public async Task<(IReadOnlyList<StockReceiving> Items, int TotalCount)> SearchPagedAsync(

        StockReceivingSearchFilter filter,

        int page,

        int pageSize,

        CancellationToken cancellationToken = default)

    {

        var query = BuildSearchQuery(filter);

        var totalCount = await query.CountAsync(cancellationToken);



        page = Math.Max(1, page);

        pageSize = Math.Clamp(pageSize, 10, 200);



        var items = await query

            .OrderByDescending(r => r.CreatedAt)

            .Skip((page - 1) * pageSize)

            .Take(pageSize)

            .AsNoTracking()

            .ToListAsync(cancellationToken);



        return (items, totalCount);

    }



    private IQueryable<StockReceiving> BuildSearchQuery(StockReceivingSearchFilter filter)

    {

        var query = DbSet

            .Include(r => r.Supplier)

            .Include(r => r.RequestedByUser)

            .Include(r => r.ReviewedByUser)

            .Include(r => r.Items)

            .Where(r => !r.IsArchived)

            .AsQueryable();



        if (filter.Status.HasValue)

            query = query.Where(r => r.Status == filter.Status.Value);

        if (filter.SupplierId.HasValue)

            query = query.Where(r => r.SupplierId == filter.SupplierId.Value);

        if (filter.RequestedByUserId.HasValue)

            query = query.Where(r => r.RequestedByUserId == filter.RequestedByUserId.Value);

        if (filter.From.HasValue)
        {
            var fromUtc = DateTime.SpecifyKind(filter.From.Value.Date, DateTimeKind.Utc);
            query = query.Where(r => r.CreatedAt >= fromUtc);
        }

        if (filter.To.HasValue)
        {
            var toUtc = DateTime.SpecifyKind(filter.To.Value.Date.AddDays(1), DateTimeKind.Utc);
            query = query.Where(r => r.CreatedAt < toUtc);
        }

        if (!string.IsNullOrWhiteSpace(filter.ReferenceNumber))

        {

            var refNum = filter.ReferenceNumber.Trim();

            query = query.Where(r =>

                r.ReferenceNumber.Contains(refNum) ||

                (r.DeliveryReceiptNumber != null && r.DeliveryReceiptNumber.Contains(refNum)));

        }

        if (!string.IsNullOrWhiteSpace(filter.Search))

        {

            var term = filter.Search.Trim().ToLower();

            query = query.Where(r =>

                r.ReceivingNumber.ToLower().Contains(term) ||

                r.Supplier.Name.ToLower().Contains(term) ||

                r.ContainerNumber.ToLower().Contains(term) ||

                r.ReferenceNumber.ToLower().Contains(term) ||

                (r.DeliveryReceiptNumber != null && r.DeliveryReceiptNumber.ToLower().Contains(term)));

        }

        if (filter.ProductId.HasValue)

            query = query.Where(r => r.Items.Any(i => i.ProductId == filter.ProductId.Value));



        return query;

    }



    public async Task<string> GenerateReceivingNumberAsync(CancellationToken cancellationToken = default)

    {

        var today = DateTime.UtcNow.ToString("yyyyMMdd");

        var prefix = $"RCV{today}";

        var count = await DbSet.CountAsync(r => r.ReceivingNumber.StartsWith(prefix), cancellationToken);

        return $"{prefix}-{(count + 1):D4}";

    }



    public Task<int> CountPendingAsync(CancellationToken cancellationToken = default) =>

        DbSet.CountAsync(r => r.Status == StockReceivingStatus.Pending, cancellationToken);



    public Task<bool> ReferenceNumberExistsAsync(string referenceNumber, Guid? excludeId, CancellationToken cancellationToken = default)

    {

        var refNorm = referenceNumber.Trim();

        var q = DbSet.Where(r => r.ReferenceNumber == refNorm);

        if (excludeId.HasValue)

            q = q.Where(r => r.Id != excludeId.Value);

        return q.AnyAsync(cancellationToken);

    }



    public Task<bool> DeliveryReceiptNumberExistsAsync(string deliveryReceiptNumber, Guid? excludeId, CancellationToken cancellationToken = default)

    {

        var dr = deliveryReceiptNumber.Trim();

        var q = DbSet.Where(r => r.DeliveryReceiptNumber == dr);

        if (excludeId.HasValue)

            q = q.Where(r => r.Id != excludeId.Value);

        return q.AnyAsync(cancellationToken);

    }



    public async Task<StockReceivingSummaryCounts> GetSummaryCountsAsync(CancellationToken cancellationToken = default)

    {

        var today = DateTime.UtcNow.Date;

        var pendingCount = await DbSet.CountAsync(
            r => !r.IsArchived && r.Status == StockReceivingStatus.Pending,
            cancellationToken);

        var approvedToday = await DbSet.CountAsync(

            r => !r.IsArchived && r.Status == StockReceivingStatus.Approved && r.ReviewedAt >= today,

            cancellationToken);

        var rejected = await DbSet.CountAsync(
            r => !r.IsArchived && r.Status == StockReceivingStatus.Rejected,
            cancellationToken);



        var pendingUnits = await Context.StockReceivingItems.AsNoTracking()

            .Where(i => !i.StockReceiving.IsArchived && i.StockReceiving.Status == StockReceivingStatus.Pending)

            .SumAsync(i => (int?)i.Quantity, cancellationToken) ?? 0;



        var pendingCost = await Context.StockReceivingItems.AsNoTracking()

            .Where(i => !i.StockReceiving.IsArchived && i.StockReceiving.Status == StockReceivingStatus.Pending)

            .SumAsync(i => (decimal?)(i.Quantity * i.CostPrice), cancellationToken) ?? 0;



        return new StockReceivingSummaryCounts(

            pendingCount,

            approvedToday,

            rejected,

            pendingUnits,

            pendingCost);

    }
}


