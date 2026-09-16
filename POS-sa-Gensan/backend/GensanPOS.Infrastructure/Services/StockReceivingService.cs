using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.StockReceiving;
using GensanPOS.Application.Exceptions;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;
using GensanPOS.Domain.Interfaces;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Services;

public class StockReceivingService : IStockReceivingService
{
    private readonly IStockReceivingRepository _receivingRepository;
    private readonly IRepository<StockReceivingAttachment> _attachmentRepository;
    private readonly ISupplierRepository _supplierRepository;
    private readonly IProductRepository _productRepository;
    private readonly IRepository<InventoryTransaction> _inventoryRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;
    private readonly AppDbContext _context;

    public StockReceivingService(
        IStockReceivingRepository receivingRepository,
        IRepository<StockReceivingAttachment> attachmentRepository,
        ISupplierRepository supplierRepository,
        IProductRepository productRepository,
        IRepository<InventoryTransaction> inventoryRepository,
        IUnitOfWork unitOfWork,
        IAuditService auditService,
        AppDbContext context)
    {
        _receivingRepository = receivingRepository;
        _attachmentRepository = attachmentRepository;
        _supplierRepository = supplierRepository;
        _productRepository = productRepository;
        _inventoryRepository = inventoryRepository;
        _unitOfWork = unitOfWork;
        _auditService = auditService;
        _context = context;
    }

    public async Task<StockReceivingSummaryDto> GetSummaryAsync(
        Guid userId, string role, bool includeFinancials, CancellationToken cancellationToken = default)
    {
        if (!RoleNames.IsOwner(role))
        {
            var mine = await _receivingRepository.SearchAsync(
                new StockReceivingSearchFilter(StockReceivingStatus.Pending, null, userId, null, null, null, null, null),
                cancellationToken);
            return new StockReceivingSummaryDto
            {
                PendingCount = mine.Count,
                TotalIncomingUnits = mine.SelectMany(r => r.Items).Sum(i => i.Quantity)
            };
        }

        var c = await _receivingRepository.GetSummaryCountsAsync(cancellationToken);
        return new StockReceivingSummaryDto
        {
            PendingCount = c.PendingCount,
            ApprovedTodayCount = c.ApprovedTodayCount,
            RejectedCount = c.RejectedCount,
            TotalIncomingUnits = c.TotalIncomingUnits,
            TotalReceivingCost = includeFinancials ? c.TotalReceivingCost : null
        };
    }

    public async Task<PagedResult<StockReceivingDto>> SearchPagedAsync(
        StockReceivingSearchQuery query,
        Guid userId,
        string role,
        bool includeFinancials,
        CancellationToken cancellationToken = default)
    {
        var filter = BuildFilter(query, userId, role);
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 10, 200);

        var (list, totalCount) = await _receivingRepository.SearchPagedAsync(
            filter, page, pageSize, cancellationToken);

        return new PagedResult<StockReceivingDto>
        {
            Items = list.Select(r => Map(r, includeFinancials)).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<IReadOnlyList<StockReceivingDto>> SearchAsync(
        StockReceivingSearchQuery query,
        Guid userId,
        string role,
        bool includeFinancials,
        CancellationToken cancellationToken = default)
    {
        var list = await _receivingRepository.SearchAsync(BuildFilter(query, userId, role), cancellationToken);
        return list.Select(r => Map(r, includeFinancials)).ToList();
    }

    private static StockReceivingSearchFilter BuildFilter(
        StockReceivingSearchQuery query, Guid userId, string role)
    {
        var filterUser = RoleNames.IsOwner(role) ? query.RequestedByUserId : userId;
        return new StockReceivingSearchFilter(
            query.Status,
            query.SupplierId,
            filterUser,
            query.From,
            query.To,
            query.ReferenceNumber,
            query.Search,
            query.ProductId);
    }

    public async Task<StockReceivingDto> GetByIdAsync(
        Guid id, Guid userId, string role, bool includeFinancials, CancellationToken cancellationToken = default)
    {
        var receiving = await _receivingRepository.GetByIdWithDetailsAsync(id, cancellationToken)
            ?? throw new NotFoundException("Stock receiving not found");

        if (!RoleNames.IsOwner(role) && receiving.RequestedByUserId != userId)
            throw new ForbiddenException("You can only view your own receiving requests");

        var dto = Map(receiving, includeFinancials);
        await EnrichWithCreatedBatchesAsync(dto, receiving, cancellationToken);
        return dto;
    }

    public async Task<DuplicateReferenceCheckDto> CheckDuplicatesAsync(
        string? referenceNumber,
        string? deliveryReceiptNumber,
        Guid? excludeId,
        CancellationToken cancellationToken = default)
    {
        var result = new DuplicateReferenceCheckDto();
        if (!string.IsNullOrWhiteSpace(referenceNumber))
        {
            result.ReferenceNumberExists = await _receivingRepository.ReferenceNumberExistsAsync(
                referenceNumber, excludeId, cancellationToken);
            if (result.ReferenceNumberExists)
            {
                var existing = await _context.StockReceivings.AsNoTracking()
                    .FirstOrDefaultAsync(r => r.ReferenceNumber == referenceNumber.Trim() && (!excludeId.HasValue || r.Id != excludeId), cancellationToken);
                result.ExistingReceivingNumber = existing?.ReceivingNumber;
            }
        }

        if (!string.IsNullOrWhiteSpace(deliveryReceiptNumber))
        {
            result.DeliveryReceiptNumberExists = await _receivingRepository.DeliveryReceiptNumberExistsAsync(
                deliveryReceiptNumber, excludeId, cancellationToken);
            if (result.DeliveryReceiptNumberExists && result.ExistingReceivingNumber is null)
            {
                var existing = await _context.StockReceivings.AsNoTracking()
                    .FirstOrDefaultAsync(r => r.DeliveryReceiptNumber == deliveryReceiptNumber.Trim() && (!excludeId.HasValue || r.Id != excludeId), cancellationToken);
                result.ExistingReceivingNumber = existing?.ReceivingNumber;
            }
        }

        return result;
    }

    public async Task<StockReceivingDto> CreateAsync(
        CreateStockReceivingRequest request,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var supplier = await _supplierRepository.GetByIdAsync(request.SupplierId, cancellationToken)
            ?? throw new NotFoundException("Supplier not found");
        if (!SupplierLabels.CanReceiveStock(supplier.Status))
            throw new AppException($"Supplier '{supplier.Name}' cannot receive stock ({SupplierLabels.Status(supplier.Status)})");

        if (await _receivingRepository.ReferenceNumberExistsAsync(request.ReferenceNumber, null, cancellationToken))
            throw new ConflictException($"Reference number '{request.ReferenceNumber}' is already used on another receiving");

        if (!string.IsNullOrWhiteSpace(request.DeliveryReceiptNumber) &&
            await _receivingRepository.DeliveryReceiptNumberExistsAsync(request.DeliveryReceiptNumber, null, cancellationToken))
            throw new ConflictException($"Delivery receipt number '{request.DeliveryReceiptNumber}' is already used");

        if (request.Items.Count == 0)
            throw new AppException("At least one product line is required");

        var receivingNumber = await _receivingRepository.GenerateReceivingNumberAsync(cancellationToken);
        var items = new List<StockReceivingItem>();

        foreach (var item in request.Items)
        {
            var product = await _productRepository.GetByIdAsync(item.ProductId, cancellationToken)
                ?? throw new NotFoundException($"Product {item.ProductId} not found");
            if (!product.IsActive)
                throw new AppException($"Product '{product.Name}' is inactive");
            if (item.Quantity <= 0)
                throw new AppException($"Quantity must be positive for {product.Sku}");

            var cost = item.CostPrice > 0 ? item.CostPrice : product.CostPrice;
            var sellingPrice = item.SellingPrice > 0 ? item.SellingPrice : product.UnitPrice;
            items.Add(new StockReceivingItem
            {
                ProductId = product.Id,
                Quantity = item.Quantity,
                ExpectedQuantity = item.ExpectedQuantity,
                CostPrice = cost,
                SellingPrice = sellingPrice,
                Remarks = item.Remarks?.Trim()
            });
        }

        var receiving = new StockReceiving
        {
            ReceivingNumber = receivingNumber,
            SupplierId = supplier.Id,
            ContainerNumber = request.ContainerNumber.Trim(),
            StockNumber = request.StockNumber.Trim(),
            ReferenceNumber = request.ReferenceNumber.Trim(),
            DeliveryReceiptNumber = string.IsNullOrWhiteSpace(request.DeliveryReceiptNumber)
                ? null
                : request.DeliveryReceiptNumber.Trim(),
            DeliveryDate = request.DeliveryDate.Date,
            Notes = request.Notes?.Trim(),
            Status = StockReceivingStatus.Pending,
            RequestedByUserId = userId,
            Items = items
        };

        await _receivingRepository.AddAsync(receiving, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            userId, null, AuditLogCategory.Operational, "REQUEST", "StockReceiving", receiving.Id.ToString(),
            $"Receiving {receivingNumber} — {supplier.Name}, {items.Count} line(s), pending approval",
            null, null, "Pending", "0", items.Sum(i => i.Quantity).ToString(), cancellationToken);

        var saved = await _receivingRepository.GetByIdWithDetailsAsync(receiving.Id, cancellationToken);
        return Map(saved!, includeFinancials: false);
    }

    public async Task<StockReceivingDto> ApproveAsync(
        Guid id,
        Guid userId,
        ApproveStockReceivingRequest? request,
        CancellationToken cancellationToken = default)
    {
        var receiving = await _receivingRepository.GetByIdWithDetailsAsync(id, cancellationToken)
            ?? throw new NotFoundException("Stock receiving not found");

        if (receiving.Status != StockReceivingStatus.Pending)
            throw new AppException("Only pending receivings can be approved");

        var receivedDate = DateOnly.FromDateTime(receiving.DeliveryDate);
        var batchSeq = await ReceivingBatchCreator.CountExistingCodesForDateAsync(
            _context, receivedDate, cancellationToken);
        var batchesCreated = 0;

        foreach (var item in receiving.Items.OrderBy(i => i.CreatedAt).ThenBy(i => i.Id))
        {
            var product = await _productRepository.GetByIdAsync(item.ProductId, cancellationToken)
                ?? throw new NotFoundException($"Product {item.ProductId} not found");

            var stockBefore = product.StockQuantity;
            var batchCode = ReceivingBatchCreator.NextBatchCode(receivedDate, ref batchSeq);
            var batch = ReceivingBatchCreator.CreateForLine(
                item, product, receiving, batchCode, receivedDate, userId);
            await _context.ProductBatches.AddAsync(batch, cancellationToken);
            batchesCreated++;
            product.CostPrice = item.CostPrice;
            product.UnitPrice = item.SellingPrice;
            await ProductBatchStockHelper.SyncProductStockAsync(_context, product, cancellationToken);
            await _productRepository.UpdateAsync(product, cancellationToken);

            var note = $"Stock Receiving — {receiving.Supplier.Name}: {receiving.Notes ?? receiving.ReferenceNumber} | Batch {batchCode}";
            if (!string.IsNullOrWhiteSpace(request?.ApprovalNotes))
                note += $" | {request.ApprovalNotes.Trim()}";

            await _inventoryRepository.AddAsync(new InventoryTransaction
            {
                ProductId = product.Id,
                ProductBatchId = batch.Id,
                Type = InventoryTransactionType.Purchase,
                Quantity = item.Quantity,
                StockBefore = stockBefore,
                StockAfter = product.StockQuantity,
                Reference = batchCode,
                Notes = note,
                StockReceivingId = receiving.Id,
                UserId = userId
            }, cancellationToken);

            await _auditService.LogAsync(
                userId, null, AuditLogCategory.Operational, "CREATE", "ProductBatch", batch.Id.ToString(),
                $"Batch {batchCode} from {receiving.ReceivingNumber} — {product.Sku}, qty {item.Quantity}, sell {item.SellingPrice:C}",
                null, null, "Success", "0", item.Quantity.ToString(), cancellationToken);

            await _auditService.LogAsync(
                userId, null, AuditLogCategory.Operational, "ADJUST", "Inventory", product.Id.ToString(),
                $"Stock receiving {receiving.ReceivingNumber} — {product.Sku}", null, null, "Success",
                stockBefore.ToString(), product.StockQuantity.ToString(), cancellationToken);
        }

        if (batchesCreated != receiving.Items.Count)
            throw new AppException("Batch creation did not complete for every receiving line");

        receiving.Status = StockReceivingStatus.Approved;
        receiving.ReviewedByUserId = userId;
        receiving.ReviewedAt = DateTime.UtcNow;
        receiving.ApprovalNotes = request?.ApprovalNotes?.Trim();

        await _receivingRepository.UpdateAsync(receiving, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var totalQty = receiving.Items.Sum(i => i.Quantity);
        var details = $"Approved {receiving.ReceivingNumber} — {totalQty} units";
        if (!string.IsNullOrWhiteSpace(receiving.ApprovalNotes))
            details += $" | {receiving.ApprovalNotes}";

        await _auditService.LogAsync(
            userId, null, AuditLogCategory.Operational, "APPROVE", "StockReceiving", id.ToString(),
            details, null, null, "Approved", "Pending", "Received", cancellationToken);

        var dto = Map(receiving, includeFinancials: true);
        await EnrichWithCreatedBatchesAsync(dto, receiving, cancellationToken);
        return dto;
    }

    public async Task<StockReceivingDto> RejectAsync(
        Guid id,
        RejectStockReceivingRequest request,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var receiving = await _receivingRepository.GetByIdWithDetailsAsync(id, cancellationToken)
            ?? throw new NotFoundException("Stock receiving not found");

        if (receiving.Status != StockReceivingStatus.Pending)
            throw new AppException("Only pending receivings can be rejected");

        if (string.IsNullOrWhiteSpace(request.Reason))
            throw new AppException("Rejection reason is required");

        receiving.Status = StockReceivingStatus.Rejected;
        receiving.ReviewedByUserId = userId;
        receiving.ReviewedAt = DateTime.UtcNow;
        receiving.RejectionReason = request.Reason.Trim();

        await _receivingRepository.UpdateAsync(receiving, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            userId, null, AuditLogCategory.Operational, "REJECT", "StockReceiving", id.ToString(),
            $"Rejected {receiving.ReceivingNumber}: {request.Reason.Trim()}", null, null, "Rejected",
            receiving.Items.Sum(i => i.Quantity).ToString(), "0", cancellationToken);

        return Map(receiving, includeFinancials: true);
    }

    public async Task<StockReceivingAttachmentDto> AddAttachmentAsync(
        Guid receivingId,
        Stream fileStream,
        string fileName,
        string contentType,
        string? description,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var receiving = await _receivingRepository.GetByIdAsync(receivingId, cancellationToken)
            ?? throw new NotFoundException("Stock receiving not found");

        var uploadsRoot = Path.Combine(AppContext.BaseDirectory, "uploads", "receiving", receivingId.ToString());
        Directory.CreateDirectory(uploadsRoot);

        var safeName = Path.GetFileName(fileName);
        var storedName = $"{Guid.NewGuid():N}_{safeName}";
        var fullPath = Path.Combine(uploadsRoot, storedName);

        await using (var fs = File.Create(fullPath))
            await fileStream.CopyToAsync(fs, cancellationToken);

        var info = new FileInfo(fullPath);
        var attachment = new StockReceivingAttachment
        {
            StockReceivingId = receivingId,
            FileName = safeName,
            StoredFileName = storedName,
            ContentType = contentType,
            FileSizeBytes = info.Length,
            Description = description?.Trim(),
            UploadedByUserId = userId
        };

        await _attachmentRepository.AddAsync(attachment, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var user = await _context.Users.FindAsync([userId], cancellationToken);
        return new StockReceivingAttachmentDto
        {
            Id = attachment.Id,
            FileName = attachment.FileName,
            ContentType = attachment.ContentType,
            FileSizeBytes = attachment.FileSizeBytes,
            Description = attachment.Description,
            UploadedByName = user?.FullName ?? "",
            CreatedAt = attachment.CreatedAt
        };
    }

    public async Task<(Stream Stream, string ContentType, string FileName)?> GetAttachmentFileAsync(
        Guid attachmentId,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var attachment = await _context.StockReceivingAttachments
            .Include(a => a.StockReceiving)
            .FirstOrDefaultAsync(a => a.Id == attachmentId, cancellationToken)
            ?? throw new NotFoundException("Attachment not found");

        if (!RoleNames.IsOwner(role) && attachment.StockReceiving.RequestedByUserId != userId)
            throw new ForbiddenException("Access denied");

        var path = Path.Combine(
            AppContext.BaseDirectory,
            "uploads",
            "receiving",
            attachment.StockReceivingId.ToString(),
            attachment.StoredFileName);

        if (!File.Exists(path))
            throw new NotFoundException("File not found on disk");

        var stream = File.OpenRead(path);
        return (stream, attachment.ContentType, attachment.FileName);
    }

    private static StockReceivingDto Map(StockReceiving r, bool includeFinancials)
    {
        var items = r.Items.Select(i => MapItem(i, includeFinancials)).ToList();
        var totalExpected = items.Where(i => i.ExpectedQuantity.HasValue).Sum(i => i.ExpectedQuantity!.Value);
        var totalQty = items.Sum(i => i.Quantity);
        var remaining = items.Where(i => i.RemainingQuantity.HasValue).Sum(i => i.RemainingQuantity!.Value);

        return new StockReceivingDto
        {
            Id = r.Id,
            ReceivingNumber = r.ReceivingNumber,
            SupplierId = r.SupplierId,
            SupplierName = r.Supplier?.Name ?? "",
            SupplierPhone = r.Supplier?.Phone,
            ContainerNumber = r.ContainerNumber,
            StockNumber = r.StockNumber,
            ReferenceNumber = r.ReferenceNumber,
            DeliveryReceiptNumber = r.DeliveryReceiptNumber,
            DeliveryDate = r.DeliveryDate,
            Status = r.Status,
            StatusLabel = StatusLabel(r.Status),
            Notes = r.Notes,
            RequestedByUserId = r.RequestedByUserId,
            RequestedByName = r.RequestedByUser?.FullName ?? r.RequestedByUser?.Email ?? "",
            RequestedAt = r.CreatedAt,
            ReviewedByUserId = r.ReviewedByUserId,
            ReviewedByName = r.ReviewedByUser?.FullName ?? r.ReviewedByUser?.Email,
            ReviewedAt = r.ReviewedAt,
            ApprovalNotes = r.ApprovalNotes,
            RejectionReason = r.RejectionReason,
            CreatedAt = r.CreatedAt,
            TotalQuantity = totalQty,
            TotalExpectedQuantity = totalExpected > 0 ? totalExpected : null,
            RemainingQuantity = remaining,
            TotalCost = includeFinancials ? items.Sum(i => i.LineTotal) : 0,
            Items = items,
            Attachments = r.Attachments?.Select(a => new StockReceivingAttachmentDto
            {
                Id = a.Id,
                FileName = a.FileName,
                ContentType = a.ContentType,
                FileSizeBytes = a.FileSizeBytes,
                Description = a.Description,
                UploadedByName = a.UploadedByUser?.FullName ?? "",
                CreatedAt = a.CreatedAt
            }).ToList() ?? []
        };
    }

    private async Task EnrichWithCreatedBatchesAsync(
        StockReceivingDto dto,
        StockReceiving receiving,
        CancellationToken cancellationToken)
    {
        if (receiving.Status != StockReceivingStatus.Approved)
            return;

        var batches = await _context.ProductBatches
            .AsNoTracking()
            .Include(b => b.Product)
            .Where(b => b.StockReceivingId == receiving.Id)
            .OrderBy(b => b.BatchCode)
            .ToListAsync(cancellationToken);

        dto.CreatedBatches = batches.Select(b => new ReceivingBatchSummaryDto
        {
            Id = b.Id,
            ProductId = b.ProductId,
            ProductName = b.Product?.Name ?? "",
            BatchCode = b.BatchCode,
            ReceivedQuantity = b.ReceivedQuantity,
            RemainingQuantity = b.Quantity,
            CostPrice = b.CostPrice,
            SellingPrice = b.SellingPrice,
            ReceivedDate = b.ReceivedDate,
            Status = ProductBatchStatusLabel(b)
        }).ToList();
        dto.BatchesCreatedCount = dto.CreatedBatches.Count;
    }

    internal static string ProductBatchStatusLabel(ProductBatch batch)
    {
        if (!batch.IsActive)
            return "Inactive";
        if (batch.Quantity <= 0)
            return "Depleted";
        return "Active";
    }

    private static StockReceivingItemDto MapItem(StockReceivingItem i, bool includeFinancials)
    {
        var currentStock = i.Product?.StockQuantity ?? 0;
        return new StockReceivingItemDto
        {
            Id = i.Id,
            ProductId = i.ProductId,
            ProductName = i.Product?.Name ?? "",
            ProductSku = i.Product?.Sku ?? "",
            UnitOfMeasure = i.Product?.UnitOfMeasure ?? "pc",
            Quantity = i.Quantity,
            ExpectedQuantity = i.ExpectedQuantity,
            RemainingQuantity = i.ExpectedQuantity.HasValue ? Math.Max(0, i.ExpectedQuantity.Value - i.Quantity) : null,
            CurrentStockQuantity = currentStock,
            ProjectedStockAfterApproval = currentStock + i.Quantity,
            CostPrice = includeFinancials ? i.CostPrice : 0,
            SellingPrice = i.SellingPrice,
            LineTotal = includeFinancials ? i.Quantity * i.CostPrice : 0,
            Remarks = i.Remarks
        };
    }

    private static string StatusLabel(StockReceivingStatus status) => status switch
    {
        StockReceivingStatus.Approved => "Approved",
        StockReceivingStatus.Rejected => "Rejected",
        _ => "Pending Owner Approval"
    };
}
