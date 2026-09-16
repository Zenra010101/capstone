using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;
using GensanPOS.Domain.Interfaces;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Repositories;

public class ChequeRepository : IChequeRepository
{
    private readonly AppDbContext _context;

    public ChequeRepository(AppDbContext context) => _context = context;

    public async Task<SaleCheque?> GetByIdWithSaleAsync(Guid id, CancellationToken cancellationToken = default) =>
        await _context.SaleCheques
            .Include(c => c.Sale)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

    public async Task<IReadOnlyList<SaleCheque>> GetListAsync(ChequeStatus? status, CancellationToken cancellationToken = default)
    {
        var query = _context.SaleCheques
            .Include(c => c.Sale)
            .AsNoTracking()
            .OrderByDescending(c => c.CreatedAt)
            .AsQueryable();

        if (status.HasValue)
            query = query.Where(c => c.Status == status.Value);

        return await query.ToListAsync(cancellationToken);
    }

    public async Task<(IReadOnlyList<SaleCheque> Items, int TotalCount)> GetPagedAsync(
        ChequeStatus? status,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _context.SaleCheques
            .Include(c => c.Sale)
            .AsNoTracking()
            .AsQueryable();

        if (status.HasValue)
            query = query.Where(c => c.Status == status.Value);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public Task<int> CountPendingAsync(CancellationToken cancellationToken = default) =>
        _context.SaleCheques.CountAsync(c => c.Status == ChequeStatus.Pending, cancellationToken);

    public async Task AddAsync(SaleCheque cheque, CancellationToken cancellationToken = default)
    {
        await _context.SaleCheques.AddAsync(cheque, cancellationToken);
    }

    public Task UpdateAsync(SaleCheque cheque, CancellationToken cancellationToken = default)
    {
        _context.SaleCheques.Update(cheque);
        return Task.CompletedTask;
    }
}
