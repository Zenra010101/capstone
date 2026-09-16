using GensanPOS.Domain.Enums;

namespace GensanPOS.Application.DTOs.Expenses;

public class ExpenseCategoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; }
    public int VoucherCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateExpenseCategoryRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class UpdateExpenseCategoryRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class ExpenseVoucherListItemDto
{
    public Guid Id { get; set; }
    public DateOnly ExpenseDate { get; set; }
    public string VoucherNumber { get; set; } = string.Empty;
    public Guid CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string Payee { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public ExpenseVoucherStatus Status { get; set; }
    public string StatusLabel { get; set; } = string.Empty;
    public ExpensePaymentMethod PaymentMethod { get; set; }
    public string PaymentMethodLabel { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class ExpenseVoucherDto : ExpenseVoucherListItemDto
{
    public string Particulars { get; set; } = string.Empty;
    public string? Bank { get; set; }
    public string? ReferenceNumber { get; set; }
    public string? Remarks { get; set; }
    public Guid CreatedByUserId { get; set; }
    public string? CreatedByName { get; set; }
    public Guid? PaidByUserId { get; set; }
    public string? PaidByName { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public IReadOnlyList<ExpenseVoucherAttachmentDto> Attachments { get; set; } = [];
}

public class ExpenseVoucherAttachmentDto
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string? Description { get; set; }
    public string? UploadedByName { get; set; }
    public DateTime CreatedAt { get; set; }
    /// <summary>False once the image file has been auto-removed from disk by retention.</summary>
    public bool FileAvailable { get; set; } = true;
    public DateTime? FilePurgedAt { get; set; }
}

public class CreateExpenseVoucherRequest
{
    public DateOnly ExpenseDate { get; set; }
    public Guid CategoryId { get; set; }
    public string Payee { get; set; } = string.Empty;
    public string Particulars { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public ExpensePaymentMethod PaymentMethod { get; set; }
    public string? Bank { get; set; }
    public string? ReferenceNumber { get; set; }
    public string? Remarks { get; set; }
}

public class UpdateExpenseVoucherRequest : CreateExpenseVoucherRequest;

public class ExpenseVoucherSearchQuery
{
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public ExpenseVoucherStatus? Status { get; set; }
    public Guid? CategoryId { get; set; }
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

public class ExpenseSummaryDto
{
    public int TotalCount { get; set; }
    public int UnpaidCount { get; set; }
    public int PaidCount { get; set; }
    public int CancelledCount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal UnpaidAmount { get; set; }
    public decimal PaidAmount { get; set; }
}

public class ExpenseReportDto
{
    public DateTime From { get; set; }
    public DateTime To { get; set; }
    public decimal GrandTotal { get; set; }
    public IReadOnlyList<ExpenseReportPeriodRowDto> DailyTotals { get; set; } = [];
    public IReadOnlyList<ExpenseReportPeriodRowDto> MonthlyTotals { get; set; } = [];
    public IReadOnlyList<ExpenseReportCategoryRowDto> ByCategory { get; set; } = [];
    public IReadOnlyList<ExpenseReportStatusRowDto> ByStatus { get; set; } = [];
}

public class ExpenseReportPeriodRowDto
{
    public string PeriodLabel { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal TotalAmount { get; set; }
}

public class ExpenseReportCategoryRowDto
{
    public Guid CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal TotalAmount { get; set; }
}

public class ExpenseReportStatusRowDto
{
    public ExpenseVoucherStatus Status { get; set; }
    public string StatusLabel { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal TotalAmount { get; set; }
}
