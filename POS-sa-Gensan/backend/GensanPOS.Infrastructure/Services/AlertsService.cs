using GensanPOS.Application.DTOs.Alerts;
using GensanPOS.Application.DTOs.Products;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using GensanPOS.Domain.Interfaces;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Services;

public class AlertsService : IAlertsService
{
    private readonly AppDbContext _context;
    private readonly IStockReceivingRepository _receivingRepository;
    private readonly IInventoryAdjustmentRepository _adjustmentRepository;
    private readonly IReceivableRepository _receivableRepository;
    private readonly IChequeRepository _chequeRepository;

    public AlertsService(
        AppDbContext context,
        IStockReceivingRepository receivingRepository,
        IInventoryAdjustmentRepository adjustmentRepository,
        IReceivableRepository receivableRepository,
        IChequeRepository chequeRepository)
    {
        _context = context;
        _receivingRepository = receivingRepository;
        _adjustmentRepository = adjustmentRepository;
        _receivableRepository = receivableRepository;
        _chequeRepository = chequeRepository;
    }

    public async Task<AlertsSummaryDto> GetSummaryAsync(
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var isOwner = RoleNames.IsOwner(role);
        var receivableSaleUserId = isOwner ? null : (Guid?)userId;

        var lowStockProducts = await _context.Products
            .Include(p => p.Category)
            .Where(p => p.IsActive && p.StockQuantity < InventoryConstants.LowStockThreshold)
            .OrderBy(p => p.StockQuantity)
            .Take(20)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var pendingCheques = await _chequeRepository.GetListAsync(Domain.Enums.ChequeStatus.Pending, cancellationToken);

        return new AlertsSummaryDto
        {
            PendingReceivingsCount = await _receivingRepository.CountPendingAsync(cancellationToken),
            PendingAdjustmentsCount = await _adjustmentRepository.CountPendingAsync(cancellationToken),
            OverdueReceivablesCount = await _receivableRepository.CountOverdueAsync(receivableSaleUserId, cancellationToken),
            TotalReceivablesOutstanding = await _receivableRepository.GetTotalOutstandingAsync(receivableSaleUserId, cancellationToken),
            PendingChequesCount = pendingCheques.Count,
            PendingChequesAmount = pendingCheques.Sum(c => c.Amount),
            LowStockCount = await _context.Products.CountAsync(
                p => p.IsActive && p.StockQuantity < InventoryConstants.LowStockThreshold,
                cancellationToken),
            LowStockProducts = lowStockProducts.Select(p =>
            {
                var status = Domain.Helpers.StockStatusHelper.FromQuantity(p.StockQuantity);
                return new ProductDto
                {
                    Id = p.Id,
                    Sku = p.Sku,
                    Name = p.Name,
                    StockQuantity = p.StockQuantity,
                    ReorderLevel = p.ReorderLevel,
                    IsActive = p.IsActive,
                    CategoryId = p.CategoryId,
                    CategoryName = p.Category?.Name ?? "",
                    UnitOfMeasure = p.UnitOfMeasure,
                    UnitPrice = p.UnitPrice,
                    CostPrice = p.CostPrice,
                    StockStatus = status,
                    StockStatusLabel = Domain.Helpers.StockStatusHelper.Label(status),
                    IsLowStock = true
                };
            }).ToList()
        };
    }
}
