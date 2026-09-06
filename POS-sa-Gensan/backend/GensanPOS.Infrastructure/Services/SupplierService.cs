using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Suppliers;
using GensanPOS.Application.Exceptions;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;
using GensanPOS.Domain.Interfaces;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Services;

public class SupplierService : ISupplierService
{
    private readonly ISupplierRepository _supplierRepository;
    private readonly IRepository<SupplierContact> _contactRepository;
    private readonly IRepository<SupplierAttachment> _attachmentRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;
    private readonly AppDbContext _context;

    public SupplierService(
        ISupplierRepository supplierRepository,
        IRepository<SupplierContact> contactRepository,
        IRepository<SupplierAttachment> attachmentRepository,
        IUnitOfWork unitOfWork,
        IAuditService auditService,
        AppDbContext context)
    {
        _supplierRepository = supplierRepository;
        _contactRepository = contactRepository;
        _attachmentRepository = attachmentRepository;
        _unitOfWork = unitOfWork;
        _auditService = auditService;
        _context = context;
    }

    public async Task<SupplierSummaryDto> GetSummaryAsync(bool includeFinancials, CancellationToken cancellationToken = default)
    {
        var all = await _context.Suppliers.AsNoTracking().ToListAsync(cancellationToken);
        var top = includeFinancials
            ? await _supplierRepository.GetSpendRankingsAsync(5, cancellationToken)
            : [];

        return new SupplierSummaryDto
        {
            TotalSuppliers = all.Count(s => s.Status != SupplierStatus.Archived),
            ActiveCount = all.Count(s => s.Status == SupplierStatus.Active),
            PreferredCount = all.Count(s => s.Status == SupplierStatus.Preferred),
            InactiveCount = all.Count(s => s.Status is SupplierStatus.Inactive or SupplierStatus.Blacklisted),
            TopSuppliersBySpend = top.Select(MapRank).ToList(),
            MostPurchasedSuppliers = top.OrderByDescending(t => t.ReceivingCount).Select(MapRank).ToList()
        };
    }

    public async Task<PagedResult<SupplierListItemDto>> SearchPagedAsync(
        SupplierSearchQuery query,
        bool includeFinancials,
        CancellationToken cancellationToken = default)
    {
        var filter = ToFilter(query);
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 10, 200);

        var (suppliers, totalCount) = await _supplierRepository.SearchPagedAsync(
            filter, page, pageSize, cancellationToken);

        var metrics = await _supplierRepository.GetListMetricsBatchAsync(
            suppliers.Select(s => s.Id).ToList(), cancellationToken);

        return new PagedResult<SupplierListItemDto>
        {
            Items = suppliers.Select(s => MapListItem(s, metrics.GetValueOrDefault(s.Id) ?? EmptyMetrics(), includeFinancials)).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<IReadOnlyList<SupplierListItemDto>> SearchAsync(
        SupplierSearchQuery query,
        bool includeFinancials,
        CancellationToken cancellationToken = default)
    {
        var list = await _supplierRepository.SearchAsync(ToFilter(query), cancellationToken);
        var metrics = await _supplierRepository.GetListMetricsBatchAsync(
            list.Select(s => s.Id).ToList(), cancellationToken);

        return list.Select(s => MapListItem(s, metrics.GetValueOrDefault(s.Id) ?? EmptyMetrics(), includeFinancials)).ToList();
    }

    private static SupplierSearchFilter ToFilter(SupplierSearchQuery query) =>
        new(query.Search, query.Status, query.PreferredOnly, query.ActiveOnly, query.ProductId, query.IncludeArchived);

    private static SupplierListMetrics EmptyMetrics() => new(0, null, 0, 0, 0, 0, 0);

    public async Task<SupplierDetailDto> GetByIdAsync(
        Guid id,
        bool includeFinancials,
        CancellationToken cancellationToken = default)
    {
        var supplier = await _supplierRepository.GetByIdWithDetailsAsync(id, cancellationToken)
            ?? throw new NotFoundException("Supplier not found");

        var metrics = await _supplierRepository.GetListMetricsAsync(id, cancellationToken);
        return MapDetail(supplier, metrics, includeFinancials);
    }

    public async Task<IReadOnlyList<SupplierCostHistoryDto>> GetCostHistoryAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        _ = await _supplierRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Supplier not found");

        var items = await _context.StockReceivingItems
            .Include(i => i.StockReceiving)
            .Include(i => i.Product)
            .Where(i => i.StockReceiving.SupplierId == id && i.StockReceiving.Status == StockReceivingStatus.Approved)
            .OrderBy(i => i.StockReceiving.ReviewedAt ?? i.CreatedAt)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var history = new List<SupplierCostHistoryDto>();
        var lastCostByProduct = new Dictionary<Guid, decimal>();

        foreach (var item in items)
        {
            var reviewed = item.StockReceiving.ReviewedAt ?? item.CreatedAt;
            if (!lastCostByProduct.TryGetValue(item.ProductId, out var oldCost))
                oldCost = item.CostPrice;

            if (oldCost != item.CostPrice)
            {
                history.Add(new SupplierCostHistoryDto
                {
                    ProductId = item.ProductId,
                    ProductName = item.Product.Name,
                    ProductSku = item.Product.Sku,
                    OldCost = oldCost,
                    NewCost = item.CostPrice,
                    RecordedAt = reviewed,
                    ReceivingReference = item.StockReceiving.ReceivingNumber
                });
            }

            lastCostByProduct[item.ProductId] = item.CostPrice;
        }

        return history.OrderByDescending(h => h.RecordedAt).ToList();
    }

    public Task<string> GetNextSupplierCodeAsync(CancellationToken cancellationToken = default) =>
        _supplierRepository.GenerateSupplierCodeAsync(cancellationToken);

    public async Task<SupplierDetailDto> CreateAsync(
        CreateSupplierRequest request,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        if (await _supplierRepository.GetByNameAsync(request.Name, null, cancellationToken) is not null)
            throw new ConflictException("Supplier name already exists");

        var supplierCode = string.IsNullOrWhiteSpace(request.SupplierCode)
            ? await _supplierRepository.GenerateSupplierCodeAsync(cancellationToken)
            : request.SupplierCode.Trim().ToUpperInvariant();

        var supplier = new Supplier
        {
            SupplierCode = supplierCode,
            Name = request.Name.Trim(),
            ContactPerson = request.ContactPerson?.Trim(),
            Phone = request.Phone?.Trim(),
            Email = request.Email?.Trim(),
            Address = request.Address?.Trim(),
            PaymentTerms = request.PaymentTerms,
            CustomPaymentTerms = request.PaymentTerms == SupplierPaymentTerms.Custom
                ? request.CustomPaymentTerms?.Trim()
                : null,
            Notes = request.Notes?.Trim(),
            DeliveryNotes = request.DeliveryNotes?.Trim(),
            SupplierRemarks = request.SupplierRemarks?.Trim(),
            Status = request.Status,
            IsActive = SupplierLabels.IsActiveStatus(request.Status),
            CreatedByUserId = userId,
            Contacts = MapContactRequests(request.Contacts)
        };

        EnsurePrimaryContact(supplier);

        await _supplierRepository.AddAsync(supplier, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            userId, null, AuditLogCategory.Operational, "CREATE", "Supplier", supplier.Id.ToString(),
            $"Created supplier {supplier.Name} — {SupplierLabels.Status(supplier.Status)}, {SupplierLabels.PaymentTerms(supplier.PaymentTerms, supplier.CustomPaymentTerms)}",
            null, null, "Success", null, supplier.Name, cancellationToken);

        return await GetByIdAsync(supplier.Id, includeFinancials: true, cancellationToken);
    }

    public async Task<SupplierDetailDto> UpdateAsync(
        Guid id,
        UpdateSupplierRequest request,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var supplier = await _supplierRepository.GetByIdWithDetailsAsync(id, cancellationToken)
            ?? throw new NotFoundException("Supplier not found");

        if (supplier.Status == SupplierStatus.Archived)
            throw new AppException("Archived suppliers cannot be edited. Restore is not supported — create a new supplier if needed.");

        if (await _supplierRepository.GetByNameAsync(request.Name, id, cancellationToken) is not null)
            throw new ConflictException("Supplier name already exists");

        var oldTerms = SupplierLabels.PaymentTerms(supplier.PaymentTerms, supplier.CustomPaymentTerms);
        var oldStatus = SupplierLabels.Status(supplier.Status);

        supplier.Name = request.Name.Trim();
        supplier.ContactPerson = request.ContactPerson?.Trim();
        supplier.Phone = request.Phone?.Trim();
        supplier.Email = request.Email?.Trim();
        supplier.Address = request.Address?.Trim();
        supplier.PaymentTerms = request.PaymentTerms;
        supplier.CustomPaymentTerms = request.PaymentTerms == SupplierPaymentTerms.Custom
            ? request.CustomPaymentTerms?.Trim()
            : null;
        supplier.Notes = request.Notes?.Trim();
        supplier.DeliveryNotes = request.DeliveryNotes?.Trim();
        supplier.SupplierRemarks = request.SupplierRemarks?.Trim();
        supplier.Status = request.Status;
        supplier.IsActive = SupplierLabels.IsActiveStatus(request.Status);

        await _context.SupplierContacts.Where(c => c.SupplierId == id).ExecuteDeleteAsync(cancellationToken);
        supplier.Contacts = MapContactRequests(request.Contacts);
        EnsurePrimaryContact(supplier);

        await _supplierRepository.UpdateAsync(supplier, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var newTerms = SupplierLabels.PaymentTerms(supplier.PaymentTerms, supplier.CustomPaymentTerms);
        var newStatus = SupplierLabels.Status(supplier.Status);
        var details = $"Updated supplier {supplier.Name}";
        if (oldTerms != newTerms)
            details += $" | Payment terms: {oldTerms} → {newTerms}";
        if (oldStatus != newStatus)
            details += $" | Status: {oldStatus} → {newStatus}";

        await _auditService.LogAsync(
            userId, null, AuditLogCategory.Operational, "UPDATE", "Supplier", id.ToString(),
            details, null, null, "Success", oldStatus, newStatus, cancellationToken);

        return await GetByIdAsync(id, includeFinancials: true, cancellationToken);
    }

    public async Task<SupplierDetailDto> ArchiveAsync(
        Guid id,
        ArchiveSupplierRequest? request,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var supplier = await _supplierRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Supplier not found");

        if (supplier.Status == SupplierStatus.Archived)
            throw new AppException("Supplier is already archived");

        supplier.Status = SupplierStatus.Archived;
        supplier.IsActive = false;

        await _supplierRepository.UpdateAsync(supplier, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var reason = request?.Reason?.Trim();
        await _auditService.LogAsync(
            userId, null, AuditLogCategory.Operational, "ARCHIVE", "Supplier", id.ToString(),
            $"Archived supplier {supplier.Name}" + (string.IsNullOrEmpty(reason) ? "" : $" — {reason}"),
            null, null, "Archived", SupplierLabels.Status(SupplierStatus.Active), "Archived", cancellationToken);

        return await GetByIdAsync(id, includeFinancials: true, cancellationToken);
    }

    public async Task<SupplierAttachmentDto> AddAttachmentAsync(
        Guid supplierId,
        Stream fileStream,
        string fileName,
        string contentType,
        string? description,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        _ = await _supplierRepository.GetByIdAsync(supplierId, cancellationToken)
            ?? throw new NotFoundException("Supplier not found");

        var uploadsRoot = Path.Combine(AppContext.BaseDirectory, "uploads", "suppliers", supplierId.ToString());
        Directory.CreateDirectory(uploadsRoot);

        var safeName = Path.GetFileName(fileName);
        var storedName = $"{Guid.NewGuid():N}_{safeName}";
        var fullPath = Path.Combine(uploadsRoot, storedName);

        await using (var fs = File.Create(fullPath))
            await fileStream.CopyToAsync(fs, cancellationToken);

        var info = new FileInfo(fullPath);
        var attachment = new SupplierAttachment
        {
            SupplierId = supplierId,
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
        return new SupplierAttachmentDto
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
        CancellationToken cancellationToken = default)
    {
        var attachment = await _context.SupplierAttachments
            .FirstOrDefaultAsync(a => a.Id == attachmentId, cancellationToken)
            ?? throw new NotFoundException("Attachment not found");

        var path = Path.Combine(
            AppContext.BaseDirectory,
            "uploads",
            "suppliers",
            attachment.SupplierId.ToString(),
            attachment.StoredFileName);

        if (!File.Exists(path))
            throw new NotFoundException("File not found on disk");

        return (File.OpenRead(path), attachment.ContentType, attachment.FileName);
    }

    private static SupplierListItemDto MapListItem(Supplier s, SupplierListMetrics m, bool includeFinancials) => new()
    {
        Id = s.Id,
        SupplierCode = s.SupplierCode,
        Name = s.Name,
        ContactPerson = s.ContactPerson ?? s.Contacts.FirstOrDefault(c => c.IsPrimary)?.Name,
        Phone = s.Phone ?? s.Contacts.FirstOrDefault(c => c.IsPrimary)?.Phone,
        Email = s.Email ?? s.Contacts.FirstOrDefault(c => c.IsPrimary)?.Email,
        Status = s.Status,
        StatusLabel = SupplierLabels.Status(s.Status),
        PaymentTerms = s.PaymentTerms,
        PaymentTermsLabel = SupplierLabels.PaymentTerms(s.PaymentTerms, s.CustomPaymentTerms),
        IsActive = s.IsActive,
        SuppliedProductCount = m.SuppliedProductCount,
        LastReceivingDate = m.LastReceivingDate,
        ApprovedReceivingCount = includeFinancials ? m.ApprovedReceivings : null,
        LifetimePurchaseValue = includeFinancials ? m.ApprovedPurchaseValue : null,
        CreatedAt = s.CreatedAt
    };

    private static SupplierDetailDto MapDetail(Supplier s, SupplierListMetrics m, bool includeFinancials)
    {
        var approved = s.StockReceivings.Where(r => r.Status == StockReceivingStatus.Approved).ToList();
        var products = BuildSuppliedProducts(approved);

        var total = m.TotalReceivings;
        var approvedCount = m.ApprovedReceivings;
        var rejected = m.RejectedReceivings;
        var approvalRate = total > 0 ? Math.Round(approvedCount * 100.0 / total, 1) : 0;
        var rejectionRate = total > 0 ? Math.Round(rejected * 100.0 / total, 1) : 0;

        return new SupplierDetailDto
        {
            Id = s.Id,
            SupplierCode = s.SupplierCode,
            Name = s.Name,
            ContactPerson = s.ContactPerson,
            Phone = s.Phone,
            Email = s.Email,
            Address = s.Address,
            PaymentTerms = s.PaymentTerms,
            PaymentTermsLabel = SupplierLabels.PaymentTerms(s.PaymentTerms, s.CustomPaymentTerms),
            CustomPaymentTerms = s.CustomPaymentTerms,
            Notes = s.Notes,
            DeliveryNotes = s.DeliveryNotes,
            SupplierRemarks = s.SupplierRemarks,
            Status = s.Status,
            StatusLabel = SupplierLabels.Status(s.Status),
            IsActive = s.IsActive,
            CreatedByUserId = s.CreatedByUserId,
            CreatedByName = s.CreatedByUser?.FullName ?? s.CreatedByUser?.Email ?? "",
            CreatedAt = s.CreatedAt,
            SuppliedProductCount = m.SuppliedProductCount,
            TotalReceivingsCount = m.TotalReceivings,
            ApprovedReceivingsCount = approvedCount,
            RejectedReceivingsCount = rejected,
            PartialDeliveriesCount = m.PartialDeliveries,
            LastReceivingDate = m.LastReceivingDate,
            ApprovedReceivingCount = includeFinancials ? m.ApprovedReceivings : null,
            LifetimePurchaseValue = includeFinancials ? m.ApprovedPurchaseValue : null,
            Contacts = s.Contacts.OrderByDescending(c => c.IsPrimary).Select(c => new SupplierContactDto
            {
                Id = c.Id,
                Name = c.Name,
                Role = c.Role,
                RoleLabel = SupplierLabels.ContactRole(c.Role),
                Phone = c.Phone,
                Email = c.Email,
                IsPrimary = c.IsPrimary
            }).ToList(),
            Attachments = s.Attachments.Select(a => new SupplierAttachmentDto
            {
                Id = a.Id,
                FileName = a.FileName,
                ContentType = a.ContentType,
                FileSizeBytes = a.FileSizeBytes,
                Description = a.Description,
                UploadedByName = a.UploadedByUser?.FullName ?? "",
                CreatedAt = a.CreatedAt
            }).ToList(),
            RecentReceivings = s.StockReceivings
                .OrderByDescending(r => r.CreatedAt)
                .Take(10)
                .Select(r => new SupplierReceivingSummaryDto
                {
                    Id = r.Id,
                    ReceivingNumber = r.ReceivingNumber,
                    DeliveryDate = r.DeliveryDate,
                    Status = r.Status,
                    StatusLabel = r.Status switch
                    {
                        StockReceivingStatus.Approved => "Approved",
                        StockReceivingStatus.Rejected => "Rejected",
                        _ => "Pending"
                    },
                    TotalQuantity = r.Items.Sum(i => i.Quantity),
                    TotalCost = includeFinancials ? r.Items.Sum(i => i.Quantity * i.CostPrice) : null,
                    CreatedAt = r.CreatedAt
                }).ToList(),
            SuppliedProducts = products,
            Performance = new SupplierPerformanceDto
            {
                TotalReceivings = total,
                ApprovedCount = approvedCount,
                RejectedCount = rejected,
                PendingCount = s.StockReceivings.Count(r => r.Status == StockReceivingStatus.Pending),
                PartialDeliveryCount = m.PartialDeliveries,
                ApprovalRatePercent = approvalRate,
                RejectionRatePercent = rejectionRate,
                ReliabilityLabel = ReliabilityLabel(approvalRate, rejectionRate, m.PartialDeliveries)
            }
        };
    }

    private static List<SupplierSuppliedProductDto> BuildSuppliedProducts(List<StockReceiving> approved)
    {
        var lines = approved
            .SelectMany(r => r.Items.Select(i => (r, i)))
            .GroupBy(x => x.i.ProductId);

        return lines.Select(g =>
        {
            var ordered = g.OrderByDescending(x => x.r.ReviewedAt ?? x.r.CreatedAt).ToList();
            var latest = ordered.First();
            var previous = ordered.Skip(1).FirstOrDefault();
            return new SupplierSuppliedProductDto
            {
                ProductId = g.Key,
                ProductName = latest.i.Product?.Name ?? "",
                ProductSku = latest.i.Product?.Sku ?? "",
                UnitOfMeasure = latest.i.Product?.UnitOfMeasure ?? "pc",
                LatestCost = latest.i.CostPrice,
                PreviousCost = previous.i?.CostPrice,
                LastDeliveryDate = latest.r.DeliveryDate,
                TotalQuantityReceived = g.Sum(x => x.i.Quantity)
            };
        }).OrderBy(p => p.ProductName).ToList();
    }

    private static string ReliabilityLabel(double approvalRate, double rejectionRate, int partial) =>
        rejectionRate > 25 ? "Needs review" :
        partial > 3 ? "Partial deliveries common" :
        approvalRate >= 90 ? "Reliable" :
        approvalRate >= 70 ? "Moderate" : "Limited history";

    private static SupplierSpendRankDto MapRank(SupplierSpendRow r) => new()
    {
        SupplierId = r.SupplierId,
        SupplierName = r.SupplierName,
        TotalSpend = r.TotalSpend,
        ReceivingCount = r.ReceivingCount
    };

    private static List<SupplierContact> MapContactRequests(List<SupplierContactRequest> contacts) =>
        contacts
            .Where(c => !string.IsNullOrWhiteSpace(c.Name))
            .Select(c => new SupplierContact
            {
                Name = c.Name.Trim(),
                Role = c.Role,
                Phone = c.Phone?.Trim(),
                Email = c.Email?.Trim(),
                IsPrimary = c.IsPrimary
            }).ToList();

    private static void EnsurePrimaryContact(Supplier supplier)
    {
        if (supplier.Contacts.Count == 0) return;
        if (!supplier.Contacts.Any(c => c.IsPrimary))
            supplier.Contacts.First().IsPrimary = true;
    }
}
