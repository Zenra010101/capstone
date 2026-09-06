using GensanPOS.Domain.Enums;

namespace GensanPOS.Application.DTOs.Suppliers;

public class SupplierListItemDto
{
    public Guid Id { get; set; }
    public string SupplierCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public SupplierStatus Status { get; set; }
    public string StatusLabel { get; set; } = string.Empty;
    public SupplierPaymentTerms PaymentTerms { get; set; }
    public string PaymentTermsLabel { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int SuppliedProductCount { get; set; }
    public DateTime? LastReceivingDate { get; set; }
    public int? ApprovedReceivingCount { get; set; }
    public decimal? LifetimePurchaseValue { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SupplierDetailDto
{
    public Guid Id { get; set; }
    public string SupplierCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public SupplierPaymentTerms PaymentTerms { get; set; }
    public string PaymentTermsLabel { get; set; } = string.Empty;
    public string? CustomPaymentTerms { get; set; }
    public string? Notes { get; set; }
    public string? DeliveryNotes { get; set; }
    public string? SupplierRemarks { get; set; }
    public SupplierStatus Status { get; set; }
    public string StatusLabel { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public Guid CreatedByUserId { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public int SuppliedProductCount { get; set; }
    public int TotalReceivingsCount { get; set; }
    public int ApprovedReceivingsCount { get; set; }
    public int RejectedReceivingsCount { get; set; }
    public int PartialDeliveriesCount { get; set; }
    public DateTime? LastReceivingDate { get; set; }
    public int? ApprovedReceivingCount { get; set; }
    public decimal? LifetimePurchaseValue { get; set; }
    public List<SupplierContactDto> Contacts { get; set; } = [];
    public List<SupplierAttachmentDto> Attachments { get; set; } = [];
    public List<SupplierReceivingSummaryDto> RecentReceivings { get; set; } = [];
    public List<SupplierSuppliedProductDto> SuppliedProducts { get; set; } = [];
    public SupplierPerformanceDto Performance { get; set; } = new();
}

public class SupplierContactDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public SupplierContactRole Role { get; set; }
    public string RoleLabel { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public bool IsPrimary { get; set; }
}

public class SupplierAttachmentDto
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string? Description { get; set; }
    public string UploadedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class SupplierReceivingSummaryDto
{
    public Guid Id { get; set; }
    public string ReceivingNumber { get; set; } = string.Empty;
    public DateTime DeliveryDate { get; set; }
    public StockReceivingStatus Status { get; set; }
    public string StatusLabel { get; set; } = string.Empty;
    public int TotalQuantity { get; set; }
    public decimal? TotalCost { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SupplierSuppliedProductDto
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public string UnitOfMeasure { get; set; } = "pc";
    public decimal LatestCost { get; set; }
    public decimal? PreviousCost { get; set; }
    public DateTime? LastDeliveryDate { get; set; }
    public int TotalQuantityReceived { get; set; }
}

public class SupplierCostHistoryDto
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public decimal OldCost { get; set; }
    public decimal NewCost { get; set; }
    public DateTime RecordedAt { get; set; }
    public string ReceivingReference { get; set; } = string.Empty;
}

public class SupplierPerformanceDto
{
    public int TotalReceivings { get; set; }
    public int ApprovedCount { get; set; }
    public int RejectedCount { get; set; }
    public int PendingCount { get; set; }
    public int PartialDeliveryCount { get; set; }
    public double ApprovalRatePercent { get; set; }
    public double RejectionRatePercent { get; set; }
    public string ReliabilityLabel { get; set; } = string.Empty;
}

public class SupplierSummaryDto
{
    public int TotalSuppliers { get; set; }
    public int ActiveCount { get; set; }
    public int PreferredCount { get; set; }
    public int InactiveCount { get; set; }
    public List<SupplierSpendRankDto> TopSuppliersBySpend { get; set; } = [];
    public List<SupplierSpendRankDto> MostPurchasedSuppliers { get; set; } = [];
}

public class SupplierSpendRankDto
{
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public decimal TotalSpend { get; set; }
    public int ReceivingCount { get; set; }
}

public class SupplierSearchQuery
{
    public string? Search { get; set; }
    public SupplierStatus? Status { get; set; }
    public bool? PreferredOnly { get; set; }
    public bool? ActiveOnly { get; set; }
    public Guid? ProductId { get; set; }
    public bool IncludeArchived { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; } = 50;
}

public class SupplierContactRequest
{
    public string Name { get; set; } = string.Empty;
    public SupplierContactRole Role { get; set; } = SupplierContactRole.General;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public bool IsPrimary { get; set; }
}

public class CreateSupplierRequest
{
    public string? SupplierCode { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public SupplierPaymentTerms PaymentTerms { get; set; } = SupplierPaymentTerms.Cod;
    public string? CustomPaymentTerms { get; set; }
    public string? Notes { get; set; }
    public string? DeliveryNotes { get; set; }
    public string? SupplierRemarks { get; set; }
    public SupplierStatus Status { get; set; } = SupplierStatus.Active;
    public List<SupplierContactRequest> Contacts { get; set; } = [];
}

public class UpdateSupplierRequest
{
    public string Name { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public SupplierPaymentTerms PaymentTerms { get; set; }
    public string? CustomPaymentTerms { get; set; }
    public string? Notes { get; set; }
    public string? DeliveryNotes { get; set; }
    public string? SupplierRemarks { get; set; }
    public SupplierStatus Status { get; set; }
    public List<SupplierContactRequest> Contacts { get; set; } = [];
}

public class NextSupplierCodeDto
{
    public string SupplierCode { get; set; } = string.Empty;
}

public class ArchiveSupplierRequest
{
    public string? Reason { get; set; }
}
