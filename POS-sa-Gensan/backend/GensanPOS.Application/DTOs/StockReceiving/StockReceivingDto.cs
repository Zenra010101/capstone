using GensanPOS.Domain.Enums;

namespace GensanPOS.Application.DTOs.StockReceiving;

public class StockReceivingDto
{
    public Guid Id { get; set; }
    public string ReceivingNumber { get; set; } = string.Empty;
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public string? SupplierPhone { get; set; }
    public string ContainerNumber { get; set; } = string.Empty;
    public string StockNumber { get; set; } = string.Empty;
    public string ReferenceNumber { get; set; } = string.Empty;
    public string? DeliveryReceiptNumber { get; set; }
    public DateTime DeliveryDate { get; set; }
    public StockReceivingStatus Status { get; set; }
    public string StatusLabel { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public Guid RequestedByUserId { get; set; }
    public string RequestedByName { get; set; } = string.Empty;
    public DateTime RequestedAt { get; set; }
    public Guid? ReviewedByUserId { get; set; }
    public string? ReviewedByName { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ApprovalNotes { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime CreatedAt { get; set; }
    public int TotalQuantity { get; set; }
    public int? TotalExpectedQuantity { get; set; }
    public int RemainingQuantity { get; set; }
    public decimal TotalCost { get; set; }
    public List<StockReceivingItemDto> Items { get; set; } = [];
    public List<StockReceivingAttachmentDto> Attachments { get; set; } = [];
    public int BatchesCreatedCount { get; set; }
    public List<ReceivingBatchSummaryDto> CreatedBatches { get; set; } = [];
}

public class ReceivingBatchSummaryDto
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string? BatchCode { get; set; }
    public int ReceivedQuantity { get; set; }
    public int RemainingQuantity { get; set; }
    public decimal CostPrice { get; set; }
    public decimal SellingPrice { get; set; }
    public DateOnly ReceivedDate { get; set; }
    public string Status { get; set; } = "Active";
}

public class StockReceivingItemDto
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public string UnitOfMeasure { get; set; } = "pc";
    public int Quantity { get; set; }
    public int? ExpectedQuantity { get; set; }
    public int? RemainingQuantity { get; set; }
    public int CurrentStockQuantity { get; set; }
    public int ProjectedStockAfterApproval { get; set; }
    public decimal CostPrice { get; set; }
    public decimal SellingPrice { get; set; }
    public decimal LineTotal { get; set; }
    public string? Remarks { get; set; }
}

public class StockReceivingAttachmentDto
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string? Description { get; set; }
    public string UploadedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class StockReceivingSummaryDto
{
    public int PendingCount { get; set; }
    public int ApprovedTodayCount { get; set; }
    public int RejectedCount { get; set; }
    public int TotalIncomingUnits { get; set; }
    public decimal? TotalReceivingCost { get; set; }
}

public class StockReceivingSearchQuery
{
    public StockReceivingStatus? Status { get; set; }
    public Guid? SupplierId { get; set; }
    public Guid? RequestedByUserId { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public string? ReferenceNumber { get; set; }
    public string? Search { get; set; }
    public Guid? ProductId { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; } = 50;
}

public class DuplicateReferenceCheckDto
{
    public bool ReferenceNumberExists { get; set; }
    public bool DeliveryReceiptNumberExists { get; set; }
    public string? ExistingReceivingNumber { get; set; }
}

public class CreateStockReceivingItemRequest
{
    public Guid ProductId { get; set; }
    public int Quantity { get; set; }
    public int? ExpectedQuantity { get; set; }
    public decimal CostPrice { get; set; }
    public decimal SellingPrice { get; set; }
    public string? Remarks { get; set; }
}

public class CreateStockReceivingRequest
{
    public Guid SupplierId { get; set; }
    public string ContainerNumber { get; set; } = string.Empty;
    public string StockNumber { get; set; } = string.Empty;
    public string ReferenceNumber { get; set; } = string.Empty;
    public string? DeliveryReceiptNumber { get; set; }
    public DateTime DeliveryDate { get; set; }
    public string? Notes { get; set; }
    public List<CreateStockReceivingItemRequest> Items { get; set; } = [];
}

public class ApproveStockReceivingRequest
{
    public string? ApprovalNotes { get; set; }
}

public class RejectStockReceivingRequest
{
    public string Reason { get; set; } = string.Empty;
}
