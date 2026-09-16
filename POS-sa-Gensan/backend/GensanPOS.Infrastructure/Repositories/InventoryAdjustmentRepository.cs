using GensanPOS.Domain.Entities;

using GensanPOS.Domain.Enums;

using GensanPOS.Domain.Interfaces;

using GensanPOS.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;



namespace GensanPOS.Infrastructure.Repositories;



public class InventoryAdjustmentRepository : Repository<InventoryAdjustmentRequest>, IInventoryAdjustmentRepository

{

    public InventoryAdjustmentRepository(AppDbContext context) : base(context) { }



    public async Task<InventoryAdjustmentRequest?> GetByIdWithDetailsAsync(Guid id, CancellationToken cancellationToken = default) =>

        await DbSet

            .Include(a => a.Product).ThenInclude(p => p.Category)

            .Include(a => a.RequestedByUser)

            .Include(a => a.ReviewedByUser)

            .Include(a => a.Lines).ThenInclude(l => l.ProductBatch).ThenInclude(b => b!.Supplier)
            .Include(a => a.Lines).ThenInclude(l => l.ProductBatch).ThenInclude(b => b!.StockReceiving).ThenInclude(r => r!.Supplier)

            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);



    public async Task<IReadOnlyList<InventoryAdjustmentRequest>> SearchAsync(

        AdjustmentRequestStatus? status,

        Guid? productId,

        Guid? requestedByUserId,

        DateTime? from,

        DateTime? to,

        string? search,

        CancellationToken cancellationToken = default)

    {

        var query = BuildSearchQuery(status, productId, requestedByUserId, from, to, search);

        return await query.OrderByDescending(a => a.CreatedAt).AsNoTracking().ToListAsync(cancellationToken);

    }



    public async Task<(IReadOnlyList<InventoryAdjustmentRequest> Items, int TotalCount)> SearchPagedAsync(

        AdjustmentRequestStatus? status,

        Guid? productId,

        Guid? requestedByUserId,

        DateTime? from,

        DateTime? to,

        string? search,

        int page,

        int pageSize,

        CancellationToken cancellationToken = default)

    {

        var query = BuildSearchQuery(status, productId, requestedByUserId, from, to, search);

        var totalCount = await query.CountAsync(cancellationToken);



        page = Math.Max(1, page);

        pageSize = Math.Clamp(pageSize, 10, 200);



        var items = await query

            .OrderByDescending(a => a.CreatedAt)

            .Skip((page - 1) * pageSize)

            .Take(pageSize)

            .AsNoTracking()

            .ToListAsync(cancellationToken);



        return (items, totalCount);

    }



    private IQueryable<InventoryAdjustmentRequest> BuildSearchQuery(

        AdjustmentRequestStatus? status,

        Guid? productId,

        Guid? requestedByUserId,

        DateTime? from,

        DateTime? to,

        string? search)

    {

        var query = DbSet

            .Include(a => a.Product).ThenInclude(p => p.Category)

            .Include(a => a.RequestedByUser)

            .Include(a => a.ReviewedByUser)

            .Include(a => a.Lines).ThenInclude(l => l.ProductBatch).ThenInclude(b => b!.Supplier)
            .Include(a => a.Lines).ThenInclude(l => l.ProductBatch).ThenInclude(b => b!.StockReceiving).ThenInclude(r => r!.Supplier)

            .AsQueryable();



        if (status.HasValue)

            query = query.Where(a => a.Status == status.Value);

        if (productId.HasValue)

            query = query.Where(a => a.ProductId == productId.Value);

        if (requestedByUserId.HasValue)

            query = query.Where(a => a.RequestedByUserId == requestedByUserId.Value);

        if (from.HasValue)
        {
            var fromUtc = DateTime.SpecifyKind(from.Value.Date, DateTimeKind.Utc);
            query = query.Where(a => a.CreatedAt >= fromUtc);
        }

        if (to.HasValue)
        {
            var toUtc = DateTime.SpecifyKind(to.Value.Date.AddDays(1), DateTimeKind.Utc);
            query = query.Where(a => a.CreatedAt < toUtc);
        }

        if (!string.IsNullOrWhiteSpace(search))

        {

            var term = search.Trim().ToLower();

            query = query.Where(a =>

                a.Product.Name.ToLower().Contains(term) ||

                a.Product.Sku.ToLower().Contains(term) ||

                a.Reason.ToLower().Contains(term) ||

                (a.Notes != null && a.Notes.ToLower().Contains(term)) ||

                a.Lines.Any(l =>
                    l.ProductBatch != null &&
                    l.ProductBatch.BatchCode != null &&
                    l.ProductBatch.BatchCode.ToLower().Contains(term)));

        }



        return query;

    }



    public Task<int> CountPendingAsync(CancellationToken cancellationToken = default) =>

        DbSet.CountAsync(a => a.Status == AdjustmentRequestStatus.Pending, cancellationToken);



    public async Task<(int Pending, int Approved, int Rejected, int NetPendingDiff)> GetSummaryCountsAsync(

        CancellationToken cancellationToken = default)

    {

        var pending = await DbSet.CountAsync(a => a.Status == AdjustmentRequestStatus.Pending, cancellationToken);

        var approved = await DbSet.CountAsync(a => a.Status == AdjustmentRequestStatus.Approved, cancellationToken);

        var rejected = await DbSet.CountAsync(a => a.Status == AdjustmentRequestStatus.Rejected, cancellationToken);

        var netPending = await DbSet

            .Where(a => a.Status == AdjustmentRequestStatus.Pending)

            .SumAsync(a => (int?)a.Difference, cancellationToken) ?? 0;



        return (pending, approved, rejected, netPending);

    }

}

