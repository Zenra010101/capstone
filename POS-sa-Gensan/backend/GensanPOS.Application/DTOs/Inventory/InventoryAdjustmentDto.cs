using GensanPOS.Domain.Enums;

namespace GensanPOS.Application.DTOs.Inventory;

public class InventoryAdjustmentRequestDto
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public string? CategoryName { get; set; }
    public string? UnitOfMeasure { get; set; }
    public int SystemQuantity { get; set; }
    public int ActualQuantity { get; set; }
    public int BeforeQuantity => SystemQuantity;
    public int AfterQuantity => ActualQuantity;
    public int Difference { get; set; }
    public AdjustmentType AdjustmentType { get; set; }
    public string AdjustmentTypeLabel { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public AdjustmentRequestStatus Status { get; set; }
    public string StatusLabel { get; set; } = string.Empty;
    public Guid RequestedByUserId { get; set; }
    public string RequestedByName { get; set; } = string.Empty;
    public DateTime RequestedAt { get; set; }
    public Guid? ReviewedByUserId { get; set; }
    public string? ReviewedByName { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ApprovalNotes { get; set; }
    public string? RejectionReason { get; set; }
    public decimal? LineInventoryValue { get; set; }
    public Guid? CountingSessionId { get; set; }
    public DateTime CreatedAt { get; set; }
    public IReadOnlyList<InventoryAdjustmentLineDto> Lines { get; set; } = [];
}

public class InventoryAdjustmentLineDto
{
    public Guid Id { get; set; }
    public Guid ProductBatchId { get; set; }
    public string? BatchCode { get; set; }
    public DateOnly ReceivedDate { get; set; }
    public string? SupplierName { get; set; }
    public decimal CostPrice { get; set; }
    public decimal SellingPrice { get; set; }
    public int SystemQuantity { get; set; }
    public int ActualQuantity { get; set; }
    public int Difference { get; set; }
}

public class InventoryAdjustmentSummaryDto
{
    public int PendingCount { get; set; }
    public int ApprovedCount { get; set; }
    public int RejectedCount { get; set; }
    public int NetUnitsPendingAdjustment { get; set; }
}

public class InventoryAdjustmentSearchQuery
{
    public AdjustmentRequestStatus? Status { get; set; }
    public Guid? ProductId { get; set; }
    public Guid? RequestedByUserId { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public string? Search { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; } = 50;
}

public class CreateInventoryAdjustmentLineRequest
{
    public Guid ProductBatchId { get; set; }
    public int ActualQuantity { get; set; }
}

public class CreateInventoryAdjustmentRequest
{
    public Guid ProductId { get; set; }
    public List<CreateInventoryAdjustmentLineRequest> Lines { get; set; } = [];
    public AdjustmentType AdjustmentType { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public Guid? CountingSessionId { get; set; }
}

public class ApproveInventoryAdjustmentRequest
{
    public string? ApprovalNotes { get; set; }
}

public class RejectInventoryAdjustmentRequest
{
    public string RejectionReason { get; set; } = string.Empty;
}
