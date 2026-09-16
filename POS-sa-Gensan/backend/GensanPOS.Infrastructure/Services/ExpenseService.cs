using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Expenses;
using GensanPOS.Application.Exceptions;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;
using GensanPOS.Domain.Interfaces;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Services;

public class ExpenseService : IExpenseService
{
    private readonly AppDbContext _context;
    private readonly IExpenseVoucherRepository _voucherRepository;
    private readonly IRepository<ExpenseCategory> _categoryRepository;
    private readonly IRepository<ExpenseVoucherAttachment> _attachmentRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditService _auditService;

    public ExpenseService(
        AppDbContext context,
        IExpenseVoucherRepository voucherRepository,
        IRepository<ExpenseCategory> categoryRepository,
        IRepository<ExpenseVoucherAttachment> attachmentRepository,
        IUnitOfWork unitOfWork,
        IAuditService auditService)
    {
        _context = context;
        _voucherRepository = voucherRepository;
        _categoryRepository = categoryRepository;
        _attachmentRepository = attachmentRepository;
        _unitOfWork = unitOfWork;
        _auditService = auditService;
    }

    public async Task<IReadOnlyList<ExpenseCategoryDto>> GetCategoriesAsync(
        Guid userId,
        string role,
        bool includeArchived,
        CancellationToken cancellationToken = default)
    {
        var query = _context.ExpenseCategories.AsNoTracking();
        if (!includeArchived)
            query = query.Where(c => c.IsActive);

        var categories = await query.OrderBy(c => c.Name).ToListAsync(cancellationToken);

        var voucherQuery = VisibleVouchers(userId, role);
        var counts = await voucherQuery
            .GroupBy(v => v.CategoryId)
            .Select(g => new { CategoryId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.CategoryId, x => x.Count, cancellationToken);

        return categories.Select(c => new ExpenseCategoryDto
        {
            Id = c.Id,
            Name = c.Name,
            Description = c.Description,
            IsActive = c.IsActive,
            VoucherCount = counts.GetValueOrDefault(c.Id),
            CreatedAt = c.CreatedAt
        }).ToList();
    }

    public async Task<ExpenseCategoryDto> CreateCategoryAsync(
        CreateExpenseCategoryRequest request,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var name = request.Name.Trim();
        if (string.IsNullOrWhiteSpace(name))
            throw new AppException("Category name is required");

        if (await _context.ExpenseCategories.AnyAsync(
                c => c.Name.ToLower() == name.ToLower() && c.IsActive, cancellationToken))
            throw new AppException($"Category '{name}' already exists");

        var category = new ExpenseCategory
        {
            Name = name,
            Description = request.Description?.Trim(),
            IsActive = true,
            CreatedByUserId = userId
        };
        await _categoryRepository.AddAsync(category, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            userId, null, AuditLogCategory.Operational, "CREATE", "ExpenseCategory", category.Id.ToString(),
            $"Created expense category {category.Name}", null, cancellationToken: cancellationToken);

        return MapCategory(category, 0);
    }

    public async Task<ExpenseCategoryDto> UpdateCategoryAsync(
        Guid id,
        UpdateExpenseCategoryRequest request,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var category = await _categoryRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Expense category not found");

        var name = request.Name.Trim();
        if (string.IsNullOrWhiteSpace(name))
            throw new AppException("Category name is required");

        if (await _context.ExpenseCategories.AnyAsync(
                c => c.Id != id && c.Name.ToLower() == name.ToLower() && c.IsActive, cancellationToken))
            throw new AppException($"Category '{name}' already exists");

        category.Name = name;
        category.Description = request.Description?.Trim();
        category.UpdatedAt = DateTime.UtcNow;
        await _categoryRepository.UpdateAsync(category, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var count = await _context.ExpenseVouchers.CountAsync(v => v.CategoryId == id, cancellationToken);
        return MapCategory(category, count);
    }

    public async Task ArchiveCategoryAsync(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        var category = await _categoryRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Expense category not found");

        category.IsActive = false;
        category.UpdatedAt = DateTime.UtcNow;
        await _categoryRepository.UpdateAsync(category, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            userId, null, AuditLogCategory.Operational, "ARCHIVE", "ExpenseCategory", category.Id.ToString(),
            $"Archived expense category {category.Name}", null, cancellationToken: cancellationToken);
    }

    public async Task<ExpenseSummaryDto> GetSummaryAsync(
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var vouchers = await VisibleVouchers(userId, role).AsNoTracking().ToListAsync(cancellationToken);
        return new ExpenseSummaryDto
        {
            TotalCount = vouchers.Count,
            UnpaidCount = vouchers.Count(v => v.Status == ExpenseVoucherStatus.Unpaid),
            PaidCount = vouchers.Count(v => v.Status == ExpenseVoucherStatus.Paid),
            CancelledCount = vouchers.Count(v => v.Status == ExpenseVoucherStatus.Cancelled),
            TotalAmount = vouchers.Where(v => v.Status != ExpenseVoucherStatus.Cancelled).Sum(v => v.Amount),
            UnpaidAmount = vouchers.Where(v => v.Status == ExpenseVoucherStatus.Unpaid).Sum(v => v.Amount),
            PaidAmount = vouchers.Where(v => v.Status == ExpenseVoucherStatus.Paid).Sum(v => v.Amount)
        };
    }

    public async Task<PagedResult<ExpenseVoucherListItemDto>> SearchPagedAsync(
        ExpenseVoucherSearchQuery query,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var filter = ToFilter(query, userId, role);
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 10, 200);
        var (items, total) = await _voucherRepository.SearchPagedAsync(filter, page, pageSize, cancellationToken);

        return new PagedResult<ExpenseVoucherListItemDto>
        {
            Items = items.Select(MapListItem).ToList(),
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<IReadOnlyList<ExpenseVoucherListItemDto>> SearchAsync(
        ExpenseVoucherSearchQuery query,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var items = await _voucherRepository.SearchAsync(ToFilter(query, userId, role), cancellationToken);
        return items.Select(MapListItem).ToList();
    }

    public async Task<ExpenseVoucherDto> GetByIdAsync(
        Guid id,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var voucher = await _voucherRepository.GetByIdWithDetailsAsync(id, cancellationToken)
            ?? throw new NotFoundException("Expense voucher not found");
        EnsureCanAccess(voucher, userId, role);
        return MapDetail(voucher);
    }

    public async Task<ExpenseVoucherDto> CreateAsync(
        CreateExpenseVoucherRequest request,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        await ValidateCategoryAsync(request.CategoryId, cancellationToken);
        ValidateVoucherRequest(request);

        var voucherNumber = await _voucherRepository.GenerateVoucherNumberAsync(cancellationToken);
        var voucher = new ExpenseVoucher
        {
            VoucherNumber = voucherNumber,
            ExpenseDate = request.ExpenseDate,
            CategoryId = request.CategoryId,
            Payee = request.Payee.Trim(),
            Particulars = request.Particulars.Trim(),
            Amount = Math.Round(request.Amount, 2),
            PaymentMethod = request.PaymentMethod,
            Bank = request.Bank?.Trim(),
            ReferenceNumber = request.ReferenceNumber?.Trim(),
            Remarks = request.Remarks?.Trim(),
            Status = ExpenseVoucherStatus.Unpaid,
            CreatedByUserId = userId
        };

        await _voucherRepository.AddAsync(voucher, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            userId, null, AuditLogCategory.Operational, "CREATE", "ExpenseVoucher", voucher.Id.ToString(),
            $"Created expense voucher {voucher.VoucherNumber} — {voucher.Payee} {voucher.Amount:C}",
            null, cancellationToken: cancellationToken);

        return MapDetail(await _voucherRepository.GetByIdWithDetailsAsync(voucher.Id, cancellationToken)
            ?? voucher);
    }

    public async Task<ExpenseVoucherDto> UpdateAsync(
        Guid id,
        UpdateExpenseVoucherRequest request,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var voucher = await _voucherRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Expense voucher not found");

        EnsureCanAccess(voucher, userId, role);

        if (voucher.Status is not ExpenseVoucherStatus.Unpaid)
            throw new AppException("Only unpaid vouchers can be edited");

        await ValidateCategoryAsync(request.CategoryId, cancellationToken);
        ValidateVoucherRequest(request);

        voucher.ExpenseDate = request.ExpenseDate;
        voucher.CategoryId = request.CategoryId;
        voucher.Payee = request.Payee.Trim();
        voucher.Particulars = request.Particulars.Trim();
        voucher.Amount = Math.Round(request.Amount, 2);
        voucher.PaymentMethod = request.PaymentMethod;
        voucher.Bank = request.Bank?.Trim();
        voucher.ReferenceNumber = request.ReferenceNumber?.Trim();
        voucher.Remarks = request.Remarks?.Trim();
        voucher.UpdatedAt = DateTime.UtcNow;

        await _voucherRepository.UpdateAsync(voucher, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, userId, role, cancellationToken);
    }

    public async Task<ExpenseVoucherDto> MarkPaidAsync(
        Guid id,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var voucher = await _voucherRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Expense voucher not found");

        EnsureCanAccess(voucher, userId, role);

        if (voucher.Status != ExpenseVoucherStatus.Unpaid)
            throw new AppException("Only unpaid vouchers can be marked as paid");

        voucher.Status = ExpenseVoucherStatus.Paid;
        voucher.PaidByUserId = userId;
        voucher.PaidAt = DateTime.UtcNow;
        voucher.UpdatedAt = DateTime.UtcNow;

        await _voucherRepository.UpdateAsync(voucher, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            userId, null, AuditLogCategory.Operational, "PAID", "ExpenseVoucher", voucher.Id.ToString(),
            $"Marked expense voucher {voucher.VoucherNumber} as paid", null, cancellationToken: cancellationToken);

        return await GetByIdAsync(id, userId, role, cancellationToken);
    }

    public async Task<ExpenseVoucherDto> CancelAsync(
        Guid id,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var voucher = await _voucherRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Expense voucher not found");

        EnsureCanAccess(voucher, userId, role);

        if (voucher.Status is ExpenseVoucherStatus.Paid or ExpenseVoucherStatus.Cancelled)
            throw new AppException("Paid or cancelled vouchers cannot be cancelled again");

        voucher.Status = ExpenseVoucherStatus.Cancelled;
        voucher.CancelledAt = DateTime.UtcNow;
        voucher.UpdatedAt = DateTime.UtcNow;

        await _voucherRepository.UpdateAsync(voucher, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            userId, null, AuditLogCategory.Operational, "CANCEL", "ExpenseVoucher", voucher.Id.ToString(),
            $"Cancelled expense voucher {voucher.VoucherNumber}", null, cancellationToken: cancellationToken);

        return await GetByIdAsync(id, userId, role, cancellationToken);
    }

    public async Task<ExpenseVoucherAttachmentDto> AddAttachmentAsync(
        Guid voucherId,
        Stream fileStream,
        string fileName,
        string contentType,
        string? description,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var voucher = await _voucherRepository.GetByIdAsync(voucherId, cancellationToken)
            ?? throw new NotFoundException("Expense voucher not found");
        EnsureCanAccess(voucher, userId, role);

        var existingCount = await _context.ExpenseVoucherAttachments
            .CountAsync(a => a.ExpenseVoucherId == voucherId, cancellationToken);

        var safeName = Path.GetFileName(fileName);
        if (existingCount >= ExpenseAttachmentPolicy.MaxAttachmentsPerVoucher)
            throw new AppException($"Maximum {ExpenseAttachmentPolicy.MaxAttachmentsPerVoucher} receipt attachments per voucher.");

        var uploadsRoot = Path.Combine(AppContext.BaseDirectory, "uploads", "expenses", voucherId.ToString());
        Directory.CreateDirectory(uploadsRoot);

        var storedName = $"{Guid.NewGuid():N}_{safeName}";
        var fullPath = Path.Combine(uploadsRoot, storedName);

        await using (var fs = File.Create(fullPath))
            await fileStream.CopyToAsync(fs, cancellationToken);

        var info = new FileInfo(fullPath);
        ExpenseAttachmentPolicy.ValidateFile(safeName, contentType, info.Length);
        var attachment = new ExpenseVoucherAttachment
        {
            ExpenseVoucherId = voucherId,
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
        return MapAttachment(attachment, user?.FullName ?? user?.Email);
    }

    public async Task<(Stream Stream, string FileName, string ContentType)> GetAttachmentStreamAsync(
        Guid attachmentId,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var attachment = await _context.ExpenseVoucherAttachments
            .Include(a => a.ExpenseVoucher)
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == attachmentId, cancellationToken)
            ?? throw new NotFoundException("Attachment not found");

        EnsureCanAccess(attachment.ExpenseVoucher, userId, role);

        if (attachment.FilePurgedAt is not null)
            throw new NotFoundException(
                "This receipt file has expired and is no longer stored on the server. Only the receipt record is kept.");

        var path = Path.Combine(
            AppContext.BaseDirectory,
            "uploads",
            "expenses",
            attachment.ExpenseVoucherId.ToString(),
            attachment.StoredFileName);

        if (!File.Exists(path))
            throw new NotFoundException("Attachment file not found on disk");

        var stream = File.OpenRead(path);
        return (stream, attachment.FileName, attachment.ContentType);
    }

    public async Task<ExpenseReportDto> GetReportAsync(
        DateTime? from,
        DateTime? to,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var fromDate = from?.Date ?? DateTime.UtcNow.Date.AddDays(-30);
        var toDate = to?.Date ?? DateTime.UtcNow.Date;
        if (toDate < fromDate)
            (fromDate, toDate) = (toDate, fromDate);

        var fromOnly = DateOnly.FromDateTime(fromDate);
        var toOnly = DateOnly.FromDateTime(toDate);

        var vouchers = await VisibleVouchers(userId, role)
            .AsNoTracking()
            .Include(v => v.Category)
            .Where(v => v.ExpenseDate >= fromOnly && v.ExpenseDate <= toOnly)
            .Where(v => v.Status != ExpenseVoucherStatus.Cancelled)
            .ToListAsync(cancellationToken);

        return new ExpenseReportDto
        {
            From = fromDate,
            To = toDate,
            GrandTotal = vouchers.Sum(v => v.Amount),
            DailyTotals = vouchers
                .GroupBy(v => v.ExpenseDate)
                .OrderBy(g => g.Key)
                .Select(g => new ExpenseReportPeriodRowDto
                {
                    PeriodLabel = g.Key.ToString("yyyy-MM-dd"),
                    Count = g.Count(),
                    TotalAmount = g.Sum(v => v.Amount)
                })
                .ToList(),
            MonthlyTotals = vouchers
                .GroupBy(v => new { v.ExpenseDate.Year, v.ExpenseDate.Month })
                .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
                .Select(g => new ExpenseReportPeriodRowDto
                {
                    PeriodLabel = $"{g.Key.Year}-{g.Key.Month:D2}",
                    Count = g.Count(),
                    TotalAmount = g.Sum(v => v.Amount)
                })
                .ToList(),
            ByCategory = vouchers
                .GroupBy(v => new { v.CategoryId, v.Category.Name })
                .OrderByDescending(g => g.Sum(v => v.Amount))
                .Select(g => new ExpenseReportCategoryRowDto
                {
                    CategoryId = g.Key.CategoryId,
                    CategoryName = g.Key.Name,
                    Count = g.Count(),
                    TotalAmount = g.Sum(v => v.Amount)
                })
                .ToList(),
            ByStatus = vouchers
                .GroupBy(v => v.Status)
                .OrderBy(g => g.Key)
                .Select(g => new ExpenseReportStatusRowDto
                {
                    Status = g.Key,
                    StatusLabel = ExpenseLabels.StatusLabel(g.Key),
                    Count = g.Count(),
                    TotalAmount = g.Sum(v => v.Amount)
                })
                .ToList()
        };
    }

    private IQueryable<ExpenseVoucher> VisibleVouchers(Guid userId, string role)
    {
        var query = _context.ExpenseVouchers.AsQueryable();
        if (!RoleNames.IsOwner(role))
            query = query.Where(v => v.CreatedByUserId == userId);
        return query;
    }

    private static void EnsureCanAccess(ExpenseVoucher voucher, Guid userId, string role)
    {
        if (RoleNames.IsOwner(role))
            return;
        if (voucher.CreatedByUserId != userId)
            throw new ForbiddenException("You cannot access this expense voucher");
    }

    private static ExpenseVoucherSearchFilter ToFilter(ExpenseVoucherSearchQuery query, Guid userId, string role) =>
        new(
            query.From,
            query.To,
            query.Status,
            query.CategoryId,
            query.Search,
            RoleNames.IsOwner(role) ? null : userId);

    private async Task ValidateCategoryAsync(Guid categoryId, CancellationToken cancellationToken)
    {
        var category = await _categoryRepository.GetByIdAsync(categoryId, cancellationToken)
            ?? throw new AppException("Invalid expense category");
        if (!category.IsActive)
            throw new AppException("Expense category is archived");
    }

    private static void ValidateVoucherRequest(CreateExpenseVoucherRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Payee))
            throw new AppException("Payee is required");
        if (string.IsNullOrWhiteSpace(request.Particulars))
            throw new AppException("Particulars are required");
        if (request.Amount <= 0)
            throw new AppException("Amount must be greater than zero");
    }

    private static ExpenseCategoryDto MapCategory(ExpenseCategory c, int count) => new()
    {
        Id = c.Id,
        Name = c.Name,
        Description = c.Description,
        IsActive = c.IsActive,
        VoucherCount = count,
        CreatedAt = c.CreatedAt
    };

    private static ExpenseVoucherListItemDto MapListItem(ExpenseVoucher v) => new()
    {
        Id = v.Id,
        ExpenseDate = v.ExpenseDate,
        VoucherNumber = v.VoucherNumber,
        CategoryId = v.CategoryId,
        CategoryName = v.Category?.Name ?? "",
        Payee = v.Payee,
        Amount = v.Amount,
        Status = v.Status,
        StatusLabel = ExpenseLabels.StatusLabel(v.Status),
        PaymentMethod = v.PaymentMethod,
        PaymentMethodLabel = ExpenseLabels.PaymentMethodLabel(v.PaymentMethod),
        CreatedAt = v.CreatedAt
    };

    private static ExpenseVoucherDto MapDetail(ExpenseVoucher v)
    {
        var item = MapListItem(v);
        return new ExpenseVoucherDto
        {
            Id = item.Id,
            ExpenseDate = item.ExpenseDate,
            VoucherNumber = item.VoucherNumber,
            CategoryId = item.CategoryId,
            CategoryName = item.CategoryName,
            Payee = item.Payee,
            Amount = item.Amount,
            Status = item.Status,
            StatusLabel = item.StatusLabel,
            PaymentMethod = item.PaymentMethod,
            PaymentMethodLabel = item.PaymentMethodLabel,
            CreatedAt = item.CreatedAt,
            Particulars = v.Particulars,
            Bank = v.Bank,
            ReferenceNumber = v.ReferenceNumber,
            Remarks = v.Remarks,
            CreatedByUserId = v.CreatedByUserId,
            CreatedByName = v.CreatedByUser?.FullName ?? v.CreatedByUser?.Email,
            PaidByUserId = v.PaidByUserId,
            PaidByName = v.PaidByUser?.FullName ?? v.PaidByUser?.Email,
            PaidAt = v.PaidAt,
            CancelledAt = v.CancelledAt,
            Attachments = v.Attachments
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => MapAttachment(a, a.UploadedByUser?.FullName ?? a.UploadedByUser?.Email))
                .ToList()
        };
    }

    private static ExpenseVoucherAttachmentDto MapAttachment(ExpenseVoucherAttachment a, string? uploadedBy) => new()
    {
        Id = a.Id,
        FileName = a.FileName,
        ContentType = a.ContentType,
        FileSizeBytes = a.FileSizeBytes,
        Description = a.Description,
        UploadedByName = uploadedBy,
        CreatedAt = a.CreatedAt,
        FileAvailable = a.FilePurgedAt is null,
        FilePurgedAt = a.FilePurgedAt
    };
}
