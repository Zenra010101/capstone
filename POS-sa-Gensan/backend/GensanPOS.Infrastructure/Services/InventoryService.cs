using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Inventory;
using GensanPOS.Application.Exceptions;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;
using GensanPOS.Domain.Helpers;
using GensanPOS.Domain.Interfaces;
using GensanPOS.Infrastructure.Persistence;
using GensanPOS.Infrastructure.Services.Reports;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Services;

public class InventoryService : IInventoryService
{
    private readonly AppDbContext _context;
    private readonly IProductRepository _productRepository;
    private readonly IRepository<InventoryTransaction> _inventoryRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;

    public InventoryService(
        AppDbContext context,
        IProductRepository productRepository,
        IRepository<InventoryTransaction> inventoryRepository,
        IUnitOfWork unitOfWork,
        IAuditService auditService)
    {
        _context = context;
        _productRepository = productRepository;
        _inventoryRepository = inventoryRepository;
        _unitOfWork = unitOfWork;
        _auditService = auditService;
    }

    public async Task<InventorySummaryDto> GetSummaryAsync(bool includeFinancials, CancellationToken cancellationToken = default)
    {
        var low = InventoryConstants.LowStockThreshold;
        var critical = InventoryConstants.CriticalStockThreshold;
        var activeQuery = _context.Products.AsNoTracking().Where(p => p.IsActive);
        var batchValueQuery = _context.ProductBatches
            .AsNoTracking()
            .Where(b => b.IsActive && b.Quantity > 0 && b.Product.IsActive);

        return new InventorySummaryDto
        {
            ActiveSkuCount = await activeQuery.CountAsync(cancellationToken),
            TotalUnits = await activeQuery.SumAsync(p => (int?)p.StockQuantity, cancellationToken) ?? 0,
            LowStockCount = await activeQuery.CountAsync(
                p => p.StockQuantity > critical && p.StockQuantity <= low, cancellationToken),
            CriticalStockCount = await activeQuery.CountAsync(
                p => p.StockQuantity > 0 && p.StockQuantity <= critical, cancellationToken),
            OutOfStockCount = await activeQuery.CountAsync(p => p.StockQuantity <= 0, cancellationToken),
            TotalInventoryValue = includeFinancials
                ? await batchValueQuery.SumAsync(b => (decimal?)(b.CostPrice * b.Quantity), cancellationToken) ?? 0
                : null
        };
    }

    public async Task<IReadOnlyList<InventoryOnHandDto>> GetOnHandAsync(
        string? search,
        Guid? categoryId,
        Guid? productId,
        bool? lowStockOnly,
        bool includeFinancials,
        CancellationToken cancellationToken = default)
    {
        var paged = await GetOnHandPagedAsync(
            search, categoryId, productId, lowStockOnly, includeFinancials, 1, 5000, cancellationToken);
        return paged.Items;
    }

    public async Task<PagedResult<InventoryOnHandDto>> GetOnHandPagedAsync(
        string? search,
        Guid? categoryId,
        Guid? productId,
        bool? lowStockOnly,
        bool includeFinancials,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 10, 200);

        var query = BuildOnHandQuery(search, categoryId, productId, lowStockOnly);
        var total = await query.CountAsync(cancellationToken);
        var products = await query
            .OrderBy(p => p.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = await MapOnHandRowsAsync(products, includeFinancials, cancellationToken);
        return new PagedResult<InventoryOnHandDto>
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<InventoryStockListReportDto> GetStockListReportAsync(
        string? search,
        Guid? categoryId,
        bool? lowStockOnly,
        CancellationToken cancellationToken = default)
    {
        var query = _context.ProductBatches
            .AsNoTracking()
            .Include(b => b.Product)
            .ThenInclude(p => p.Category)
            .Where(b => b.IsActive && b.Quantity > 0 && b.Product.IsActive);

        if (categoryId.HasValue)
            query = query.Where(b => b.Product.CategoryId == categoryId.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(b =>
                b.Product.Name.ToLower().Contains(term) ||
                b.Product.Sku.ToLower().Contains(term) ||
                (b.Product.Category != null && b.Product.Category.Name.ToLower().Contains(term)) ||
                (b.BatchCode != null && b.BatchCode.ToLower().Contains(term)));
        }

        if (lowStockOnly == true)
            query = query.Where(b => b.Product.StockQuantity <= InventoryConstants.LowStockThreshold);

        var batches = await query
            .OrderBy(b => b.Product.Name)
            .ThenBy(b => b.ReceivedDate)
            .ToListAsync(cancellationToken);

        var lines = batches.Select(b => new InventoryStockListLineDto
        {
            ProductName = b.Product.Name,
            ProductSku = b.Product.Sku,
            BatchCode = string.IsNullOrWhiteSpace(b.BatchCode) ? "—" : b.BatchCode.Trim(),
            ReceivedDate = b.ReceivedDate,
            ReceivedQuantity = b.ReceivedQuantity,
            RemainingQuantity = b.Quantity,
            CostPrice = b.CostPrice,
            SellingPrice = b.SellingPrice,
            ValueAtCost = Math.Round(b.CostPrice * b.Quantity, 2)
        }).ToList();

        var stamp = SalesReportTimeZone.CreateStamp();
        return new InventoryStockListReportDto
        {
            PeriodLabel = $"Stock list as of {stamp.PrintedAtLabel}",
            GeneratedAt = stamp.GeneratedAt,
            PrintedAtLabel = stamp.PrintedAtLabel,
            PrintedDateLabel = stamp.PrintedDateLabel,
            TotalValueAtCost = lines.Sum(l => l.ValueAtCost),
            Lines = lines
        };
    }

    public Task<InventoryTransactionDto> AdjustAsync(
        AdjustInventoryRequest request,
        Guid userId,
        CancellationToken cancellationToken = default) =>
        throw new AppException(
            "Direct product-level stock adjustments are disabled. Use Inventory → Adjustments to count each batch and submit for owner approval.");

    public async Task<IReadOnlyList<InventoryTransactionDto>> GetTransactionsAsync(Guid? productId, CancellationToken cancellationToken = default)
    {
        var query = BuildTransactionQuery(new InventorySearchQuery { ProductId = productId, Page = 1, PageSize = 200 });
        var transactions = await query
            .OrderByDescending(t => t.CreatedAt)
            .Take(200)
            .ToListAsync(cancellationToken);

        return transactions.Select(t => Map(t, t.Product, t.User?.FullName ?? t.User?.Email)).ToList();
    }

    public async Task<PagedResult<InventoryTransactionDto>> GetTransactionsPagedAsync(
        InventorySearchQuery q,
        CancellationToken cancellationToken = default)
    {
        q.Page = Math.Max(1, q.Page);
        q.PageSize = Math.Clamp(q.PageSize, 10, 200);

        var query = BuildTransactionQuery(q);
        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(t => t.CreatedAt)
            .Skip((q.Page - 1) * q.PageSize)
            .Take(q.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<InventoryTransactionDto>
        {
            Items = items.Select(t => Map(t, t.Product, t.User?.FullName ?? t.User?.Email)).ToList(),
            TotalCount = total,
            Page = q.Page,
            PageSize = q.PageSize
        };
    }

    private IQueryable<InventoryTransaction> BuildTransactionQuery(InventorySearchQuery q)
    {
        var query = _context.InventoryTransactions
            .Include(t => t.Product)
            .ThenInclude(p => p.Category)
            .Include(t => t.ProductBatch)
            .Include(t => t.User)
            .AsNoTracking()
            .AsQueryable();

        if (q.ProductId.HasValue)
            query = query.Where(t => t.ProductId == q.ProductId.Value);
        if (q.CategoryId.HasValue)
            query = query.Where(t => t.Product.CategoryId == q.CategoryId.Value);
        if (q.Type.HasValue)
            query = query.Where(t => t.Type == q.Type.Value);
        if (q.UserId.HasValue)
            query = query.Where(t => t.UserId == q.UserId.Value);
        if (!string.IsNullOrWhiteSpace(q.Reference))
        {
            var r = q.Reference.Trim();
            query = query.Where(t => t.Reference != null && t.Reference.Contains(r));
        }
        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var term = q.Search.Trim().ToLower();
            query = query.Where(t =>
                t.Product.Name.ToLower().Contains(term) ||
                t.Product.Sku.ToLower().Contains(term));
        }
        if (q.From.HasValue)
        {
            var fromUtc = DateTime.SpecifyKind(q.From.Value.Date, DateTimeKind.Utc);
            query = query.Where(t => t.CreatedAt >= fromUtc);
        }
        if (q.To.HasValue)
        {
            var toUtc = DateTime.SpecifyKind(q.To.Value.Date.AddDays(1), DateTimeKind.Utc);
            query = query.Where(t => t.CreatedAt < toUtc);
        }
        if (q.LowStockOnly == true)
            query = query.Where(t => t.Product.StockQuantity <= InventoryConstants.LowStockThreshold);

        return query;
    }

    private IQueryable<Product> BuildOnHandQuery(
        string? search,
        Guid? categoryId,
        Guid? productId,
        bool? lowStockOnly)
    {
        var query = _context.Products
            .Include(p => p.Category)
            .AsNoTracking()
            .Where(p => p.IsActive);

        if (productId.HasValue)
            query = query.Where(p => p.Id == productId.Value);
        if (categoryId.HasValue)
            query = query.Where(p => p.CategoryId == categoryId.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(p =>
                p.Name.ToLower().Contains(term) ||
                p.Sku.ToLower().Contains(term) ||
                (p.Category != null && p.Category.Name.ToLower().Contains(term)) ||
                (p.Barcode != null && p.Barcode.ToLower().Contains(term)));
        }

        if (lowStockOnly == true)
            query = query.Where(p => p.StockQuantity <= InventoryConstants.LowStockThreshold);

        return query;
    }

    private async Task<List<InventoryOnHandDto>> MapOnHandRowsAsync(
        List<Product> products,
        bool includeFinancials,
        CancellationToken cancellationToken)
    {
        var productIds = products.Select(p => p.Id).ToList();
        var lastMovements = await _context.InventoryTransactions
            .AsNoTracking()
            .Where(t => productIds.Contains(t.ProductId))
            .GroupBy(t => t.ProductId)
            .Select(g => new { ProductId = g.Key, LastAt = g.Max(t => t.CreatedAt) })
            .ToListAsync(cancellationToken);

        var lastMap = lastMovements.ToDictionary(x => x.ProductId, x => x.LastAt);
        var batchValueRows = includeFinancials
            ? await _context.ProductBatches
                .AsNoTracking()
                .Where(b => productIds.Contains(b.ProductId) && b.IsActive && b.Quantity > 0)
                .GroupBy(b => b.ProductId)
                .Select(g => new
                {
                    ProductId = g.Key,
                    Value = g.Sum(b => b.CostPrice * b.Quantity),
                    Quantity = g.Sum(b => b.Quantity)
                })
                .ToListAsync(cancellationToken)
            : [];
        var batchValueMap = batchValueRows.ToDictionary(x => x.ProductId);

        return products.Select(p =>
        {
            var status = StockStatusHelper.FromQuantity(p.StockQuantity);
            batchValueMap.TryGetValue(p.Id, out var batchValue);
            return new InventoryOnHandDto
            {
                ProductId = p.Id,
                ProductName = p.Name,
                ProductSku = p.Sku,
                CategoryId = p.CategoryId,
                CategoryName = p.Category?.Name ?? "",
                UnitOfMeasure = p.UnitOfMeasure,
                StockQuantity = p.StockQuantity,
                StockStatus = status,
                StockStatusLabel = StockStatusHelper.Label(status),
                LastMovementAt = lastMap.GetValueOrDefault(p.Id),
                CostPrice = includeFinancials && batchValue is not null && batchValue.Quantity > 0
                    ? Math.Round(batchValue.Value / batchValue.Quantity, 2)
                    : includeFinancials ? p.CostPrice : null,
                InventoryValue = includeFinancials ? batchValue?.Value ?? 0 : null
            };
        }).ToList();
    }

    private static InventoryTransactionDto Map(InventoryTransaction t, Product p, string? userName)
    {
        var label = InventoryMovementLabels.Label(t.Type, t.Notes, t.Reference);
        return new InventoryTransactionDto
        {
            Id = t.Id,
            ProductId = t.ProductId,
            ProductName = p.Name,
            ProductSku = p.Sku,
            CategoryName = p.Category?.Name ?? "",
            Type = t.Type,
            MovementTypeLabel = label,
            Quantity = t.Quantity,
            StockBefore = t.StockBefore,
            StockAfter = t.StockAfter,
            Reference = t.Reference,
            Reason = t.Notes,
            UserId = t.UserId,
            UserName = userName,
            ProductBatchId = t.ProductBatchId,
            BatchCode = t.ProductBatch?.BatchCode,
            CreatedAt = t.CreatedAt
        };
    }
}
