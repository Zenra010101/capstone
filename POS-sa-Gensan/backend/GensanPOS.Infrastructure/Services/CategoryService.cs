using GensanPOS.Application.DTOs.Categories;
using GensanPOS.Application.Exceptions;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;
using GensanPOS.Domain.Interfaces;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Services;

public class CategoryService : ICategoryService
{
    private readonly IRepository<Category> _categoryRepository;
    private readonly AppDbContext _context;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;

    public CategoryService(
        IRepository<Category> categoryRepository,
        AppDbContext context,
        IUnitOfWork unitOfWork,
        IAuditService auditService)
    {
        _categoryRepository = categoryRepository;
        _context = context;
        _unitOfWork = unitOfWork;
        _auditService = auditService;
    }

    public async Task<IReadOnlyList<CategoryDto>> GetAllAsync(
        string? search,
        bool? includeArchived,
        bool? lowStockOnly,
        bool? emptyOnly,
        bool? withActiveProductsOnly,
        bool includeFinancials,
        CancellationToken cancellationToken = default)
    {
        var metrics = await BuildMetricsAsync(includeFinancials, cancellationToken);
        var query = _context.Categories
            .Include(c => c.ParentCategory)
            .Include(c => c.CreatedByUser)
            .AsNoTracking()
            .AsQueryable();

        if (includeArchived != true)
            query = query.Where(c => c.IsActive);

        if (withActiveProductsOnly == true)
        {
            var categoryIdsWithProducts = await _context.Products
                .AsNoTracking()
                .Where(p => p.IsActive)
                .Select(p => p.CategoryId)
                .Distinct()
                .ToListAsync(cancellationToken);
            query = query.Where(c => categoryIdsWithProducts.Contains(c.Id));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(c =>
                c.Name.ToLower().Contains(term) ||
                (c.Description != null && c.Description.ToLower().Contains(term)));
        }

        var categories = await query.OrderBy(c => c.Name).ToListAsync(cancellationToken);

        var result = categories
            .Select(c => Map(c, metrics.GetValueOrDefault(c.Id)))
            .ToList();

        if (lowStockOnly == true)
            result = result.Where(c => c.LowStockCount > 0).ToList();

        if (emptyOnly == true)
            result = result.Where(c => c.ProductCount == 0).ToList();

        return result;
    }

    public async Task<CategorySummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default)
    {
        var metrics = await BuildMetricsAsync(includeFinancials: true, cancellationToken);
        var all = await _context.Categories.AsNoTracking().ToListAsync(cancellationToken);
        return new CategorySummaryDto
        {
            TotalCategories = all.Count,
            ActiveCategories = all.Count(c => c.IsActive),
            ArchivedCategories = all.Count(c => !c.IsActive),
            CategoriesWithLowStock = metrics.Values.Count(m => m.LowStockCount > 0),
            EmptyCategories = metrics.Values.Count(m => m.ProductCount == 0)
        };
    }

    public async Task<CategoryDto> GetByIdAsync(Guid id, bool includeFinancials, CancellationToken cancellationToken = default)
    {
        var category = await _context.Categories
            .Include(c => c.ParentCategory)
            .Include(c => c.CreatedByUser)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken)
            ?? throw new NotFoundException("Category not found");

        var metrics = await BuildMetricsAsync(includeFinancials, cancellationToken);
        return Map(category, metrics.GetValueOrDefault(id));
    }

    public async Task<CategoryDto> CreateAsync(CreateCategoryRequest request, Guid userId, CancellationToken cancellationToken = default)
    {
        await ValidateParentAsync(request.ParentCategoryId, null, cancellationToken);

        var category = new Category
        {
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            Icon = NormalizeIcon(request.Icon),
            ColorAccent = NormalizeColor(request.ColorAccent),
            ParentCategoryId = request.ParentCategoryId,
            CreatedByUserId = userId
        };

        await _categoryRepository.AddAsync(category, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            userId, null, AuditLogCategory.Operational, "CREATE", "Category", category.Id.ToString(),
            $"Created category {category.Name}", null, cancellationToken: cancellationToken);

        category = await _context.Categories
            .Include(c => c.CreatedByUser)
            .FirstAsync(c => c.Id == category.Id, cancellationToken);

        var metrics = await BuildMetricsAsync(true, cancellationToken);
        return Map(category, metrics.GetValueOrDefault(category.Id));
    }

    public async Task<CategoryDto> UpdateAsync(Guid id, UpdateCategoryRequest request, Guid userId, CancellationToken cancellationToken = default)
    {
        var category = await _categoryRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Category not found");

        if (request.ParentCategoryId == id)
            throw new AppException("A category cannot be its own parent");

        await ValidateParentAsync(request.ParentCategoryId, id, cancellationToken);

        category.Name = request.Name.Trim();
        category.Description = request.Description?.Trim();
        category.Icon = NormalizeIcon(request.Icon);
        category.ColorAccent = NormalizeColor(request.ColorAccent);
        category.IsActive = request.IsActive;
        category.ParentCategoryId = request.ParentCategoryId;

        await _categoryRepository.UpdateAsync(category, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            userId, null, AuditLogCategory.Operational, "UPDATE", "Category", id.ToString(),
            $"Updated category {category.Name}", null, cancellationToken: cancellationToken);

        category = await _context.Categories
            .Include(c => c.ParentCategory)
            .Include(c => c.CreatedByUser)
            .FirstAsync(c => c.Id == id, cancellationToken);

        var metrics = await BuildMetricsAsync(true, cancellationToken);
        return Map(category, metrics.GetValueOrDefault(id));
    }

    public async Task ArchiveAsync(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        var category = await _categoryRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Category not found");

        if (!category.IsActive)
            return;

        category.IsActive = false;
        await _categoryRepository.UpdateAsync(category, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            userId, null, AuditLogCategory.Operational, "ARCHIVE", "Category", id.ToString(),
            $"Archived category {category.Name} (products preserved)", null, cancellationToken: cancellationToken);
    }

    public async Task<int> ArchiveEmptyCategoriesAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var activeCategoryIds = await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => p.CategoryId)
            .Distinct()
            .ToListAsync(cancellationToken);

        var emptyCategories = await _context.Categories
            .Where(c => c.IsActive && !activeCategoryIds.Contains(c.Id))
            .ToListAsync(cancellationToken);

        foreach (var category in emptyCategories)
        {
            category.IsActive = false;
            await _categoryRepository.UpdateAsync(category, cancellationToken);
        }

        if (emptyCategories.Count == 0)
            return 0;

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            userId,
            null,
            AuditLogCategory.Operational,
            "CATALOG_ARCHIVE",
            "Category",
            null,
            $"Archived {emptyCategories.Count} empty categor{(emptyCategories.Count == 1 ? "y" : "ies")}: {string.Join(", ", emptyCategories.Select(c => c.Name))}",
            null,
            cancellationToken: cancellationToken);

        return emptyCategories.Count;
    }

    private async Task ValidateParentAsync(Guid? parentId, Guid? categoryId, CancellationToken cancellationToken)
    {
        if (!parentId.HasValue) return;
        if (parentId == categoryId)
            throw new AppException("Invalid parent category");

        var parent = await _categoryRepository.GetByIdAsync(parentId.Value, cancellationToken)
            ?? throw new NotFoundException("Parent category not found");
        if (!parent.IsActive)
            throw new AppException("Parent category must be active");
    }

    private async Task<Dictionary<Guid, CategoryMetrics>> BuildMetricsAsync(
        bool includeFinancials,
        CancellationToken cancellationToken)
    {
        var threshold = InventoryConstants.LowStockThreshold;

        var productStats = await _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .GroupBy(p => p.CategoryId)
            .Select(g => new
            {
                CategoryId = g.Key,
                ProductCount = g.Count(),
                TotalStock = g.Sum(p => p.StockQuantity),
                LowStock = g.Count(p => p.StockQuantity <= threshold),
                InventoryValue = g.Sum(p => p.CostPrice * p.StockQuantity)
            })
            .ToListAsync(cancellationToken);

        var dict = productStats.ToDictionary(
            x => x.CategoryId,
            x => new CategoryMetrics
            {
                ProductCount = x.ProductCount,
                TotalStockUnits = x.TotalStock,
                LowStockCount = x.LowStock,
                TotalInventoryValue = includeFinancials ? x.InventoryValue : null
            });

        if (includeFinancials)
        {
            var from = DateTime.UtcNow.Date.AddDays(-30);
            var salesStats = await _context.SaleItems
                .AsNoTracking()
                .Where(si =>
                    si.Sale.Status == SaleStatus.Completed &&
                    si.Sale.CreatedAt >= from &&
                    si.Product != null)
                .GroupBy(si => si.Product!.CategoryId)
                .Select(g => new
                {
                    CategoryId = g.Key,
                    Revenue = g.Sum(x => x.LineTotal),
                    Profit = g.Sum(x => x.ProfitAmount)
                })
                .ToListAsync(cancellationToken);

            foreach (var s in salesStats)
            {
                if (!dict.TryGetValue(s.CategoryId, out var m))
                {
                    m = new CategoryMetrics();
                    dict[s.CategoryId] = m;
                }
                m.RevenueLast30Days = s.Revenue;
                m.ProfitLast30Days = s.Profit;
            }
        }

        foreach (var catId in await _context.Categories.Select(c => c.Id).ToListAsync(cancellationToken))
        {
            if (!dict.ContainsKey(catId))
                dict[catId] = new CategoryMetrics();
        }

        return dict;
    }

    private static CategoryDto Map(Category c, CategoryMetrics? m)
    {
        m ??= new CategoryMetrics();
        return new CategoryDto
        {
            Id = c.Id,
            Name = c.Name,
            Description = c.Description,
            Icon = c.Icon,
            ColorAccent = c.ColorAccent,
            IsActive = c.IsActive,
            StatusLabel = c.IsActive ? "Active" : "Archived",
            ParentCategoryId = c.ParentCategoryId,
            ParentCategoryName = c.ParentCategory?.Name,
            CreatedAt = c.CreatedAt,
            CreatedByUserId = c.CreatedByUserId,
            CreatedByName = c.CreatedByUser?.FullName ?? c.CreatedByUser?.Email,
            ProductCount = m.ProductCount,
            TotalStockUnits = m.TotalStockUnits,
            LowStockCount = m.LowStockCount,
            TotalInventoryValue = m.TotalInventoryValue,
            ProfitLast30Days = m.ProfitLast30Days,
            RevenueLast30Days = m.RevenueLast30Days
        };
    }

    private static string? NormalizeIcon(string? icon) =>
        string.IsNullOrWhiteSpace(icon) ? null : icon.Trim();

    private static string? NormalizeColor(string? color) =>
        string.IsNullOrWhiteSpace(color) ? null : color.Trim().ToLowerInvariant();

    private sealed class CategoryMetrics
    {
        public int ProductCount { get; set; }
        public int TotalStockUnits { get; set; }
        public int LowStockCount { get; set; }
        public decimal? TotalInventoryValue { get; set; }
        public decimal? ProfitLast30Days { get; set; }
        public decimal? RevenueLast30Days { get; set; }
    }
}
