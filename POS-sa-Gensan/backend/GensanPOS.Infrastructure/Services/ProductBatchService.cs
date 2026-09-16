using GensanPOS.Application.DTOs.Products;
using GensanPOS.Application.Exceptions;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;
using GensanPOS.Domain.Interfaces;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Services;

public class ProductBatchService : IProductBatchService
{
    private readonly AppDbContext _context;
    private readonly IProductRepository _productRepository;
    private readonly IRepository<InventoryTransaction> _inventoryRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;

    public ProductBatchService(
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

    public async Task<IReadOnlyList<ProductBatchDto>> GetByProductIdAsync(
        Guid productId,
        CancellationToken cancellationToken = default)
    {
        _ = await _productRepository.GetByIdAsync(productId, cancellationToken)
            ?? throw new NotFoundException("Product not found");

        var batches = await _context.ProductBatches
            .AsNoTracking()
            .Include(b => b.Supplier)
            .Include(b => b.StockReceiving).ThenInclude(r => r!.Supplier)
            .Include(b => b.ReceivedByUser)
            .Include(b => b.ApprovedByUser)
            .Where(b => b.ProductId == productId)
            .OrderBy(b => b.ReceivedDate)
            .ThenBy(b => b.CreatedAt)
            .ThenBy(b => b.Id)
            .ToListAsync(cancellationToken);

        return batches.Select(Map).ToList();
    }

    public Task<ProductBatchDto> CreateAsync(
        Guid productId,
        CreateProductBatchRequest request,
        Guid userId,
        CancellationToken cancellationToken = default) =>
        throw new AppException(
            "Inventory batches are created automatically when stock receiving is approved. Submit a receiving request instead.");

    public Task<ProductBatchDto> AdjustQuantityAsync(
        Guid batchId,
        AdjustProductBatchRequest request,
        Guid userId,
        CancellationToken cancellationToken = default) =>
        throw new AppException(
            "Direct batch quantity edits are disabled. Use Inventory → Adjustments to count batches and submit for owner approval.");

    private static ProductBatchDto Map(ProductBatch b) => new()
    {
        Id = b.Id,
        ProductId = b.ProductId,
        BatchCode = b.BatchCode,
        CostPrice = b.CostPrice,
        SellingPrice = b.SellingPrice,
        ReceivedQuantity = b.ReceivedQuantity,
        RemainingQuantity = b.Quantity,
        ReceivedDate = b.ReceivedDate,
        StockReceivingId = b.StockReceivingId,
        StockReceivingItemId = b.StockReceivingItemId,
        SupplierId = b.SupplierId ?? b.StockReceiving?.SupplierId,
        SupplierName = b.Supplier?.Name ?? b.StockReceiving?.Supplier?.Name,
        ReceivedByUserId = b.ReceivedByUserId,
        ReceivedByName = b.ReceivedByUser?.FullName ?? b.ReceivedByUser?.Email,
        ApprovedByUserId = b.ApprovedByUserId,
        ApprovedByName = b.ApprovedByUser?.FullName ?? b.ApprovedByUser?.Email,
        Status = StockReceivingService.ProductBatchStatusLabel(b),
        IsActive = b.IsActive,
        CreatedAt = b.CreatedAt
    };
}
