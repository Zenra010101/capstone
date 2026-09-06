using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Inventory;
using GensanPOS.Application.Exceptions;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;
using GensanPOS.Domain.Interfaces;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Services;

public class InventoryAdjustmentService : IInventoryAdjustmentService
{
    private readonly IInventoryAdjustmentRepository _adjustmentRepository;
    private readonly IProductRepository _productRepository;
    private readonly IRepository<InventoryTransaction> _inventoryRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;
    private readonly AppDbContext _context;

    public InventoryAdjustmentService(
        IInventoryAdjustmentRepository adjustmentRepository,
        IProductRepository productRepository,
        IRepository<InventoryTransaction> inventoryRepository,
        IUnitOfWork unitOfWork,
        IAuditService auditService,
        AppDbContext context)
    {
        _adjustmentRepository = adjustmentRepository;
        _productRepository = productRepository;
        _inventoryRepository = inventoryRepository;
        _unitOfWork = unitOfWork;
        _auditService = auditService;
        _context = context;
    }

    public async Task<InventoryAdjustmentSummaryDto> GetSummaryAsync(
        Guid userId, string role, CancellationToken cancellationToken = default)
    {
        if (!RoleNames.IsOwner(role))
        {
            var mine = await _adjustmentRepository.SearchAsync(
                AdjustmentRequestStatus.Pending, null, userId, null, null, null, cancellationToken);
            return new InventoryAdjustmentSummaryDto
            {
                PendingCount = mine.Count,
                NetUnitsPendingAdjustment = mine.Sum(a => a.Difference)
            };
        }

        var counts = await _adjustmentRepository.GetSummaryCountsAsync(cancellationToken);
        return new InventoryAdjustmentSummaryDto
        {
            PendingCount = counts.Pending,
            ApprovedCount = counts.Approved,
            RejectedCount = counts.Rejected,
            NetUnitsPendingAdjustment = counts.NetPendingDiff
        };
    }

    public async Task<PagedResult<InventoryAdjustmentRequestDto>> SearchPagedAsync(
        InventoryAdjustmentSearchQuery query,
        Guid userId,
        string role,
        bool includeFinancials,
        CancellationToken cancellationToken = default)
    {
        var requesterFilter = RoleNames.IsOwner(role) ? query.RequestedByUserId : userId;
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 10, 200);

        var (list, totalCount) = await _adjustmentRepository.SearchPagedAsync(
            query.Status,
            query.ProductId,
            requesterFilter,
            query.From,
            query.To,
            query.Search,
            page,
            pageSize,
            cancellationToken);

        return new PagedResult<InventoryAdjustmentRequestDto>
        {
            Items = list.Select(a => Map(a, includeFinancials)).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<IReadOnlyList<InventoryAdjustmentRequestDto>> SearchAsync(
        InventoryAdjustmentSearchQuery query,
        Guid userId,
        string role,
        bool includeFinancials,
        CancellationToken cancellationToken = default)
    {
        var requesterFilter = RoleNames.IsOwner(role) ? query.RequestedByUserId : userId;
        var list = await _adjustmentRepository.SearchAsync(
            query.Status,
            query.ProductId,
            requesterFilter,
            query.From,
            query.To,
            query.Search,
            cancellationToken);
        return list.Select(a => Map(a, includeFinancials)).ToList();
    }

    public async Task<InventoryAdjustmentRequestDto> GetByIdAsync(
        Guid id, Guid userId, string role, bool includeFinancials, CancellationToken cancellationToken = default)
    {
        var adjustment = await _adjustmentRepository.GetByIdWithDetailsAsync(id, cancellationToken)
            ?? throw new NotFoundException("Adjustment request not found");
        if (!RoleNames.IsOwner(role) && adjustment.RequestedByUserId != userId)
            throw new NotFoundException("Adjustment request not found");
        return Map(adjustment, includeFinancials);
    }

    public async Task<InventoryAdjustmentRequestDto> CreateRequestAsync(
        CreateInventoryAdjustmentRequest request,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
            throw new AppException("Reason is required");

        if (request.Lines.Count == 0)
            throw new AppException("Physical count is required for each in-stock batch");

        var product = await _productRepository.GetByIdWithCategoryAsync(request.ProductId, cancellationToken)
            ?? throw new NotFoundException("Product not found");

        var batches = await _context.ProductBatches
            .Where(b => b.ProductId == product.Id && b.IsActive && b.Quantity > 0)
            .OrderBy(b => b.ReceivedDate)
            .ThenBy(b => b.CreatedAt)
            .ToListAsync(cancellationToken);

        var pending = await _adjustmentRepository.SearchAsync(
            AdjustmentRequestStatus.Pending, product.Id, null, null, null, null, cancellationToken);
        if (pending.Any())
            throw new AppException("A pending adjustment already exists for this product");

        if (batches.Count == 0)
        {
            if (request.Lines.Count == 0)
                throw new AppException("Enter the physical count to initialize opening stock");

            var actualQty = request.Lines[0].ActualQuantity;
            if (actualQty < 0)
                throw new AppException("Batch count cannot be negative");
            if (actualQty == 0)
                throw new AppException("Count matches system quantity (0) — no adjustment needed");

            var seedBatch = new ProductBatch
            {
                ProductId = product.Id,
                BatchCode = $"INIT-{DateTime.UtcNow:yyyyMMdd}",
                CostPrice = product.CostPrice,
                SellingPrice = product.UnitPrice,
                ReceivedQuantity = 0,
                Quantity = 0,
                ReceivedDate = DateOnly.FromDateTime(DateTime.UtcNow),
                IsActive = true
            };
            await _context.ProductBatches.AddAsync(seedBatch, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            var initialLine = new InventoryAdjustmentRequestLine
            {
                ProductBatchId = seedBatch.Id,
                SystemQuantity = 0,
                ActualQuantity = actualQty,
                Difference = actualQty
            };

            var initialAdjustment = new InventoryAdjustmentRequest
            {
                ProductId = product.Id,
                SystemQuantity = 0,
                ActualQuantity = actualQty,
                Difference = actualQty,
                AdjustmentType = request.AdjustmentType,
                Reason = request.Reason.Trim(),
                Notes = request.Notes?.Trim(),
                RequestedByUserId = userId,
                CountingSessionId = request.CountingSessionId,
                Lines = [initialLine]
            };

            await _adjustmentRepository.AddAsync(initialAdjustment, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            var initialTypeLabel = AdjustmentTypeLabels.Label(request.AdjustmentType);
            await _auditService.LogAsync(
                userId, null, AuditLogCategory.Operational, "REQUEST", "InventoryAdjustment", initialAdjustment.Id.ToString(),
                $"{initialTypeLabel} — {product.Sku}: opening stock request from 0 to {actualQty}", null, null, "Pending",
                "0", actualQty.ToString(), cancellationToken);

            var initialSaved = await _adjustmentRepository.GetByIdWithDetailsAsync(initialAdjustment.Id, cancellationToken);
            return Map(initialSaved!, includeFinancials: false);
        }

        var lineByBatch = request.Lines.ToDictionary(l => l.ProductBatchId);
        foreach (var batch in batches)
        {
            if (!lineByBatch.ContainsKey(batch.Id))
            {
                var label = StringClip.BatchLabel(batch.BatchCode, batch.Id);
                throw new AppException($"Physical count required for batch {label}");
            }
        }

        foreach (var line in request.Lines)
        {
            if (!batches.Any(b => b.Id == line.ProductBatchId))
                throw new AppException("One or more batches are not eligible for counting (depleted, inactive, or wrong product)");
            if (line.ActualQuantity < 0)
                throw new AppException("Batch count cannot be negative");
        }

        var adjustmentLines = new List<InventoryAdjustmentRequestLine>();
        var systemTotal = 0;
        var actualTotal = 0;

        foreach (var batch in batches)
        {
            var req = lineByBatch[batch.Id];
            var systemQty = batch.Quantity;
            var actualQty = req.ActualQuantity;
            var difference = actualQty - systemQty;

            systemTotal += systemQty;
            actualTotal += actualQty;

            adjustmentLines.Add(new InventoryAdjustmentRequestLine
            {
                ProductBatchId = batch.Id,
                SystemQuantity = systemQty,
                ActualQuantity = actualQty,
                Difference = difference
            });
        }

        var totalDifference = actualTotal - systemTotal;
        if (totalDifference == 0)
            throw new AppException("Physical counts match system quantities — no adjustment needed");

        var adjustment = new InventoryAdjustmentRequest
        {
            ProductId = product.Id,
            SystemQuantity = systemTotal,
            ActualQuantity = actualTotal,
            Difference = totalDifference,
            AdjustmentType = request.AdjustmentType,
            Reason = request.Reason.Trim(),
            Notes = request.Notes?.Trim(),
            RequestedByUserId = userId,
            CountingSessionId = request.CountingSessionId,
            Lines = adjustmentLines
        };

        await _adjustmentRepository.AddAsync(adjustment, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var typeLabel = AdjustmentTypeLabels.Label(request.AdjustmentType);
        await _auditService.LogAsync(
            userId, null, AuditLogCategory.Operational, "REQUEST", "InventoryAdjustment", adjustment.Id.ToString(),
            $"{typeLabel} — {product.Sku}: batch count request ({adjustmentLines.Count} batches)", null, null, "Pending",
            systemTotal.ToString(), actualTotal.ToString(), cancellationToken);

        var saved = await _adjustmentRepository.GetByIdWithDetailsAsync(adjustment.Id, cancellationToken);
        return Map(saved!, includeFinancials: false);
    }

    public async Task<InventoryAdjustmentRequestDto> ApproveAsync(
        Guid id,
        Guid ownerUserId,
        ApproveInventoryAdjustmentRequest? request,
        CancellationToken cancellationToken = default)
    {
        var adjustment = await _adjustmentRepository.GetByIdWithDetailsAsync(id, cancellationToken)
            ?? throw new NotFoundException("Adjustment request not found");

        if (adjustment.Status != AdjustmentRequestStatus.Pending)
            throw new AppException("Only pending requests can be approved");

        if (adjustment.Lines.Count == 0)
            throw new AppException("Adjustment has no batch lines — cannot approve");

        var product = await _productRepository.GetByIdAsync(adjustment.ProductId, cancellationToken)
            ?? throw new NotFoundException("Product not found");

        var stockBefore = product.StockQuantity;
        var typeLabel = AdjustmentTypeLabels.Label(adjustment.AdjustmentType);
        var movementNoteBase = $"[{typeLabel}] {adjustment.Reason}";
        if (!string.IsNullOrWhiteSpace(request?.ApprovalNotes))
            movementNoteBase += $" | {request.ApprovalNotes.Trim()}";

        var refBase = StringClip.Take($"ADJ-{adjustment.Id:N}", 20);
        var requesterName = adjustment.RequestedByUser?.FullName ?? adjustment.RequestedByUser?.Email ?? "";

        foreach (var line in adjustment.Lines.OrderBy(l => l.ProductBatch?.ReceivedDate).ThenBy(l => l.CreatedAt))
        {
            if (line.Difference == 0)
                continue;

            var batch = await _context.ProductBatches
                .FirstOrDefaultAsync(b => b.Id == line.ProductBatchId, cancellationToken)
                ?? throw new AppException("A batch on this request no longer exists");

            var batchRef = StringClip.BatchLabel(batch.BatchCode, batch.Id);

            if (batch.Quantity != line.SystemQuantity)
            {
                throw new AppException(
                    $"Batch {batchRef} changed since the count was submitted (was {line.SystemQuantity}, now {batch.Quantity}). Reject this request and submit a new count.");
            }

            var batchBefore = batch.Quantity;
            batch.Quantity = line.ActualQuantity;
            batch.UpdatedAt = DateTime.UtcNow;
            var batchNote = $"{movementNoteBase} | Batch {batchRef}";
            await _inventoryRepository.AddAsync(new InventoryTransaction
            {
                ProductId = product.Id,
                ProductBatchId = batch.Id,
                Type = InventoryTransactionType.Adjustment,
                Quantity = line.Difference,
                StockBefore = batchBefore,
                StockAfter = line.ActualQuantity,
                Reference = StringClip.Take($"{refBase}/{batchRef}", 50),
                Notes = batchNote,
                UserId = ownerUserId
            }, cancellationToken);

            await _auditService.LogAsync(
                ownerUserId, null, AuditLogCategory.Operational, "ADJUST", "ProductBatch", batch.Id.ToString(),
                $"{typeLabel} — {product.Sku} batch {batchRef}: {batchBefore} → {line.ActualQuantity} ({line.Difference:+0;-0;0}). {adjustment.Reason}",
                null, null, "Approved",
                batchBefore.ToString(), line.ActualQuantity.ToString(), cancellationToken);
        }

        await ProductBatchStockHelper.SyncProductStockAsync(_context, product, cancellationToken);
        await _productRepository.UpdateAsync(product, cancellationToken);

        adjustment.Status = AdjustmentRequestStatus.Approved;
        adjustment.ReviewedByUserId = ownerUserId;
        adjustment.ReviewedAt = DateTime.UtcNow;
        adjustment.ApprovalNotes = request?.ApprovalNotes?.Trim();

        await _adjustmentRepository.UpdateAsync(adjustment, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var affectedBatches = adjustment.Lines.Count(l => l.Difference != 0);
        var approveDetails =
            $"Approved — {product.Sku} ({typeLabel}). Variance {adjustment.Difference:+0;-0;0} across {affectedBatches} batch(es). Requested by {requesterName}. Reason: {adjustment.Reason}";
        if (!string.IsNullOrWhiteSpace(adjustment.ApprovalNotes))
            approveDetails += $" | {adjustment.ApprovalNotes}";

        await _auditService.LogAsync(
            ownerUserId, null, AuditLogCategory.Operational, "APPROVE", "InventoryAdjustment", id.ToString(),
            approveDetails, null, null, "Approved",
            stockBefore.ToString(), product.StockQuantity.ToString(), cancellationToken);

        var saved = await _adjustmentRepository.GetByIdWithDetailsAsync(id, cancellationToken);
        return Map(saved!, includeFinancials: true);
    }

    public async Task<InventoryAdjustmentRequestDto> RejectAsync(
        Guid id,
        Guid ownerUserId,
        RejectInventoryAdjustmentRequest request,
        CancellationToken cancellationToken = default)
    {
        var adjustment = await _adjustmentRepository.GetByIdWithDetailsAsync(id, cancellationToken)
            ?? throw new NotFoundException("Adjustment request not found");

        if (adjustment.Status != AdjustmentRequestStatus.Pending)
            throw new AppException("Only pending requests can be rejected");

        if (string.IsNullOrWhiteSpace(request.RejectionReason))
            throw new AppException("Rejection reason is required");

        adjustment.Status = AdjustmentRequestStatus.Rejected;
        adjustment.ReviewedByUserId = ownerUserId;
        adjustment.ReviewedAt = DateTime.UtcNow;
        adjustment.RejectionReason = request.RejectionReason.Trim();

        await _adjustmentRepository.UpdateAsync(adjustment, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            ownerUserId, null, AuditLogCategory.Operational, "REJECT", "InventoryAdjustment", id.ToString(),
            $"Rejected — {adjustment.Product?.Sku}: {request.RejectionReason.Trim()}", null, null, "Rejected",
            adjustment.SystemQuantity.ToString(), adjustment.ActualQuantity.ToString(), cancellationToken);

        var saved = await _adjustmentRepository.GetByIdWithDetailsAsync(id, cancellationToken);
        return Map(saved!, includeFinancials: true);
    }

    private static InventoryAdjustmentRequestDto Map(InventoryAdjustmentRequest a, bool includeFinancials)
    {
        var statusLabel = a.Status switch
        {
            AdjustmentRequestStatus.Approved => "Approved",
            AdjustmentRequestStatus.Rejected => "Rejected",
            _ => "Pending"
        };

        var lines = a.Lines
            .OrderBy(l => l.ProductBatch?.ReceivedDate)
            .ThenBy(l => l.CreatedAt)
            .Select(l => new InventoryAdjustmentLineDto
            {
                Id = l.Id,
                ProductBatchId = l.ProductBatchId,
                BatchCode = l.ProductBatch?.BatchCode,
                ReceivedDate = l.ProductBatch?.ReceivedDate ?? default,
                SupplierName = l.ProductBatch?.Supplier?.Name
                    ?? l.ProductBatch?.StockReceiving?.Supplier?.Name,
                CostPrice = l.ProductBatch?.CostPrice ?? a.Product?.CostPrice ?? 0,
                SellingPrice = l.ProductBatch?.SellingPrice ?? a.Product?.UnitPrice ?? 0,
                SystemQuantity = l.SystemQuantity,
                ActualQuantity = l.ActualQuantity,
                Difference = l.Difference
            })
            .ToList();

        decimal? lineValue = null;
        if (includeFinancials)
        {
            lineValue = lines.Sum(l => l.CostPrice * l.ActualQuantity);
        }

        return new InventoryAdjustmentRequestDto
        {
            Id = a.Id,
            ProductId = a.ProductId,
            ProductName = a.Product?.Name ?? "",
            ProductSku = a.Product?.Sku ?? "",
            CategoryName = a.Product?.Category?.Name,
            UnitOfMeasure = a.Product?.UnitOfMeasure,
            SystemQuantity = a.SystemQuantity,
            ActualQuantity = a.ActualQuantity,
            Difference = a.Difference,
            AdjustmentType = a.AdjustmentType,
            AdjustmentTypeLabel = AdjustmentTypeLabels.Label(a.AdjustmentType),
            Reason = a.Reason,
            Notes = a.Notes,
            Status = a.Status,
            StatusLabel = statusLabel,
            RequestedByUserId = a.RequestedByUserId,
            RequestedByName = a.RequestedByUser?.FullName ?? a.RequestedByUser?.Email ?? "",
            RequestedAt = a.CreatedAt,
            ReviewedByUserId = a.ReviewedByUserId,
            ReviewedByName = a.ReviewedByUser?.FullName ?? a.ReviewedByUser?.Email,
            ReviewedAt = a.ReviewedAt,
            ApprovalNotes = a.ApprovalNotes,
            RejectionReason = a.RejectionReason,
            LineInventoryValue = lineValue,
            CountingSessionId = a.CountingSessionId,
            CreatedAt = a.CreatedAt,
            Lines = lines
        };
    }
}
