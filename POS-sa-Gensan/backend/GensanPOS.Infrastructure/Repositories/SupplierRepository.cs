using GensanPOS.Domain.Entities;

using GensanPOS.Domain.Enums;

using GensanPOS.Domain.Interfaces;

using GensanPOS.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;



namespace GensanPOS.Infrastructure.Repositories;



public class SupplierRepository : Repository<Supplier>, ISupplierRepository

{

    private readonly AppDbContext _context;



    public SupplierRepository(AppDbContext context) : base(context) => _context = context;



    public async Task<Supplier?> GetByNameAsync(string name, Guid? excludeId, CancellationToken cancellationToken = default)

    {

        var q = DbSet.Where(s => s.Name.ToLower() == name.Trim().ToLower());

        if (excludeId.HasValue)

            q = q.Where(s => s.Id != excludeId.Value);

        return await q.FirstOrDefaultAsync(cancellationToken);

    }



    public async Task<Supplier?> GetByIdWithDetailsAsync(Guid id, CancellationToken cancellationToken = default) =>

        await DbSet

            .Include(s => s.CreatedByUser)

            .Include(s => s.Contacts)

            .Include(s => s.Attachments).ThenInclude(a => a.UploadedByUser)

            .Include(s => s.StockReceivings).ThenInclude(r => r.Items)

            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);



    public async Task<IReadOnlyList<Supplier>> SearchAsync(

        SupplierSearchFilter filter,

        CancellationToken cancellationToken = default)

    {

        var query = BuildSearchQuery(filter);

        return await query.OrderBy(s => s.Name).AsNoTracking().ToListAsync(cancellationToken);

    }



    public async Task<(IReadOnlyList<Supplier> Items, int TotalCount)> SearchPagedAsync(

        SupplierSearchFilter filter,

        int page,

        int pageSize,

        CancellationToken cancellationToken = default)

    {

        var query = BuildSearchQuery(filter);

        var totalCount = await query.CountAsync(cancellationToken);



        page = Math.Max(1, page);

        pageSize = Math.Clamp(pageSize, 10, 200);



        var items = await query

            .OrderBy(s => s.Name)

            .Skip((page - 1) * pageSize)

            .Take(pageSize)

            .AsNoTracking()

            .ToListAsync(cancellationToken);



        return (items, totalCount);

    }



    private IQueryable<Supplier> BuildSearchQuery(SupplierSearchFilter filter)

    {

        var query = DbSet.Include(s => s.Contacts).AsQueryable();



        if (!filter.IncludeArchived)

            query = query.Where(s => s.Status != SupplierStatus.Archived);



        if (filter.Status.HasValue)

            query = query.Where(s => s.Status == filter.Status.Value);

        if (filter.PreferredOnly == true)

            query = query.Where(s => s.Status == SupplierStatus.Preferred);

        if (filter.ActiveOnly == true)

            query = query.Where(s => s.Status == SupplierStatus.Active || s.Status == SupplierStatus.Preferred);

        if (filter.ProductId.HasValue)

        {

            var productId = filter.ProductId.Value;

            query = query.Where(s => s.StockReceivings.Any(r =>

                r.Items.Any(i => i.ProductId == productId)));

        }

        if (!string.IsNullOrWhiteSpace(filter.Search))

        {

            var term = filter.Search.Trim().ToLower();

            query = query.Where(s =>

                s.Name.ToLower().Contains(term) ||

                (s.ContactPerson != null && s.ContactPerson.ToLower().Contains(term)) ||

                (s.Phone != null && s.Phone.Contains(term)) ||

                (s.Email != null && s.Email.ToLower().Contains(term)) ||

                s.Contacts.Any(c => c.Name.ToLower().Contains(term)));

        }



        return query;

    }



    public Task<bool> HasReceivingHistoryAsync(Guid supplierId, CancellationToken cancellationToken = default) =>

        _context.StockReceivings.AnyAsync(r => r.SupplierId == supplierId, cancellationToken);



    public async Task<SupplierListMetrics> GetListMetricsAsync(Guid supplierId, CancellationToken cancellationToken = default)

    {

        var batch = await GetListMetricsBatchAsync([supplierId], cancellationToken);

        return batch.GetValueOrDefault(supplierId) ?? EmptyMetrics();

    }



    public async Task<IReadOnlyDictionary<Guid, SupplierListMetrics>> GetListMetricsBatchAsync(

        IReadOnlyList<Guid> supplierIds,

        CancellationToken cancellationToken = default)

    {

        if (supplierIds.Count == 0)

            return new Dictionary<Guid, SupplierListMetrics>();



        var ids = supplierIds.Distinct().ToList();



        var receivingStats = await _context.StockReceivings.AsNoTracking()

            .Where(r => ids.Contains(r.SupplierId))

            .GroupBy(r => r.SupplierId)

            .Select(g => new

            {

                SupplierId = g.Key,

                Total = g.Count(),

                Approved = g.Count(r => r.Status == StockReceivingStatus.Approved),

                Rejected = g.Count(r => r.Status == StockReceivingStatus.Rejected),

                LastDelivery = g.Max(r => r.DeliveryDate)

            })

            .ToListAsync(cancellationToken);



        var itemStats = await _context.StockReceivingItems.AsNoTracking()

            .Where(i => ids.Contains(i.StockReceiving.SupplierId)

                && i.StockReceiving.Status == StockReceivingStatus.Approved)

            .GroupBy(i => i.StockReceiving.SupplierId)

            .Select(g => new

            {

                SupplierId = g.Key,

                ProductCount = g.Select(i => i.ProductId).Distinct().Count(),

                Value = g.Sum(i => i.Quantity * i.CostPrice)

            })

            .ToListAsync(cancellationToken);



        var partialCounts = await _context.StockReceivings.AsNoTracking()

            .Where(r => ids.Contains(r.SupplierId))

            .Where(r => r.Items.Any(i => i.ExpectedQuantity.HasValue && i.Quantity < i.ExpectedQuantity.Value))

            .GroupBy(r => r.SupplierId)

            .Select(g => new { SupplierId = g.Key, Count = g.Count() })

            .ToListAsync(cancellationToken);



        var dict = ids.ToDictionary(id => id, _ => EmptyMetrics());



        foreach (var row in receivingStats)

        {

            dict[row.SupplierId] = dict[row.SupplierId] with

            {

                TotalReceivings = row.Total,

                ApprovedReceivings = row.Approved,

                RejectedReceivings = row.Rejected,

                LastReceivingDate = row.LastDelivery

            };

        }



        foreach (var row in itemStats)

        {

            dict[row.SupplierId] = dict[row.SupplierId] with

            {

                SuppliedProductCount = row.ProductCount,

                ApprovedPurchaseValue = row.Value

            };

        }



        foreach (var row in partialCounts)

            dict[row.SupplierId] = dict[row.SupplierId] with { PartialDeliveries = row.Count };



        return dict;

    }



    private static SupplierListMetrics EmptyMetrics() => new(0, null, 0, 0, 0, 0, 0);



    public async Task<IReadOnlyList<SupplierSpendRow>> GetSpendRankingsAsync(int top, CancellationToken cancellationToken = default)

    {

        var rows = await _context.StockReceivingItems.AsNoTracking()

            .Where(i => i.StockReceiving.Status == StockReceivingStatus.Approved)

            .GroupBy(i => i.StockReceiving.SupplierId)

            .Select(g => new

            {

                SupplierId = g.Key,

                TotalSpend = g.Sum(i => i.Quantity * i.CostPrice),

                ReceivingCount = g.Select(i => i.StockReceivingId).Distinct().Count()

            })

            .OrderByDescending(x => x.TotalSpend)

            .Take(top)

            .Join(

                _context.Suppliers.AsNoTracking(),

                x => x.SupplierId,

                s => s.Id,

                (x, s) => new SupplierSpendRow(x.SupplierId, s.Name, x.TotalSpend, x.ReceivingCount))

            .ToListAsync(cancellationToken);



        return rows;

    }



    public async Task<string> GenerateSupplierCodeAsync(CancellationToken cancellationToken = default)

    {

        var codes = await DbSet

            .Where(s => s.SupplierCode.StartsWith("SUP-"))

            .Select(s => s.SupplierCode)

            .ToListAsync(cancellationToken);



        var max = 0;

        foreach (var code in codes)

        {

            if (code.Length > 4 && int.TryParse(code.AsSpan(4), out var n))

                max = Math.Max(max, n);

        }



        return $"SUP-{(max + 1):D4}";

    }

}

