using GensanPOS.Application.DTOs.Search;
using GensanPOS.Application.Interfaces;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Services;

public class GlobalSearchService : IGlobalSearchService
{
    private readonly AppDbContext _context;

    public GlobalSearchService(AppDbContext context) => _context = context;

    public async Task<GlobalSearchResultDto> SearchAsync(string query, CancellationToken cancellationToken = default)
    {
        var term = query.Trim().ToLower();
        if (term.Length < 2)
            return new GlobalSearchResultDto();

        var products = await _context.Products
            .Where(p => p.IsActive && (
                p.Name.ToLower().Contains(term) ||
                p.Sku.ToLower().Contains(term) ||
                (p.Barcode != null && p.Barcode.ToLower().Contains(term))))
            .OrderBy(p => p.Name)
            .Take(8)
            .Select(p => new { p.Id, p.Name, p.Sku })
            .ToListAsync(cancellationToken);

        var customers = await _context.Customers
            .Where(c => c.IsActive && (
                c.Name.ToLower().Contains(term) ||
                (c.Phone != null && c.Phone.Contains(term))))
            .OrderBy(c => c.Name)
            .Take(6)
            .Select(c => new { c.Id, c.Name, c.Phone })
            .ToListAsync(cancellationToken);

        var suppliers = await _context.Suppliers
            .Where(s => s.Status != Domain.Enums.SupplierStatus.Archived && (
                s.Name.ToLower().Contains(term) ||
                (s.ContactPerson != null && s.ContactPerson.ToLower().Contains(term))))
            .OrderBy(s => s.Name)
            .Take(6)
            .Select(s => new { s.Id, s.Name })
            .ToListAsync(cancellationToken);

        return new GlobalSearchResultDto
        {
            Products = products.Select(p => new GlobalSearchHitDto
            {
                Id = p.Id.ToString(),
                Label = p.Name,
                Subtitle = p.Sku,
                Route = $"/products?search={Uri.EscapeDataString(query.Trim())}"
            }).ToList(),
            Customers = customers.Select(c => new GlobalSearchHitDto
            {
                Id = c.Id.ToString(),
                Label = c.Name,
                Subtitle = c.Phone,
                Route = $"/customers?id={c.Id}"
            }).ToList(),
            Suppliers = suppliers.Select(s => new GlobalSearchHitDto
            {
                Id = s.Id.ToString(),
                Label = s.Name,
                Route = $"/suppliers?id={s.Id}"
            }).ToList()
        };
    }
}
