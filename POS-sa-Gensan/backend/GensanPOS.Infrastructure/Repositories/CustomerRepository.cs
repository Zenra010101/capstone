using GensanPOS.Domain.Entities;

using GensanPOS.Domain.Interfaces;

using GensanPOS.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;



namespace GensanPOS.Infrastructure.Repositories;



public class CustomerRepository : Repository<Customer>, ICustomerRepository

{

    public CustomerRepository(AppDbContext context) : base(context) { }



    public async Task<IReadOnlyList<Customer>> SearchAsync(

        string? search,

        bool includeInactive,

        CancellationToken cancellationToken = default)

    {

        var query = BuildSearchQuery(search, includeInactive);

        return await query.OrderBy(c => c.Name).AsNoTracking().ToListAsync(cancellationToken);

    }



    public async Task<(IReadOnlyList<Customer> Items, int TotalCount)> SearchPagedAsync(

        string? search,

        bool includeInactive,

        int page,

        int pageSize,

        CancellationToken cancellationToken = default)

    {

        var query = BuildSearchQuery(search, includeInactive);

        var totalCount = await query.CountAsync(cancellationToken);



        page = Math.Max(1, page);

        pageSize = Math.Clamp(pageSize, 10, 200);



        var items = await query

            .OrderBy(c => c.Name)

            .Skip((page - 1) * pageSize)

            .Take(pageSize)

            .AsNoTracking()

            .ToListAsync(cancellationToken);



        return (items, totalCount);

    }



    private IQueryable<Customer> BuildSearchQuery(string? search, bool includeInactive)

    {

        var query = DbSet.AsQueryable();

        if (!includeInactive)

            query = query.Where(c => c.IsActive);



        if (!string.IsNullOrWhiteSpace(search))

        {

            var term = search.Trim().ToLower();

            query = query.Where(c =>

                c.Name.ToLower().Contains(term) ||

                (c.Phone != null && c.Phone.Contains(term)) ||

                (c.Email != null && c.Email.ToLower().Contains(term)) ||

                c.CustomerCode.ToLower().Contains(term));

        }



        return query;

    }



    public async Task<Customer?> GetByIdWithReceivablesAsync(Guid id, CancellationToken cancellationToken = default) =>

        await DbSet

            .Include(c => c.Receivables)

            .ThenInclude(r => r.Sale)

            .Include(c => c.Receivables)

            .ThenInclude(r => r.Payments)

            .ThenInclude(p => p.RecordedByUser)

            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);



    public async Task<string> GenerateCustomerCodeAsync(CancellationToken cancellationToken = default)

    {

        var codes = await DbSet

            .Where(c => c.CustomerCode.StartsWith("CUS-"))

            .Select(c => c.CustomerCode)

            .ToListAsync(cancellationToken);



        var max = 0;

        foreach (var code in codes)

        {

            if (code.Length > 4 && int.TryParse(code.AsSpan(4), out var n))

                max = Math.Max(max, n);

        }



        return $"CUS-{(max + 1):D4}";

    }

}

