namespace GensanPOS.Application.DTOs.Products;

public class ProductBatchDto
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string? BatchCode { get; set; }
    public decimal CostPrice { get; set; }
    public decimal SellingPrice { get; set; }
    public int ReceivedQuantity { get; set; }
    public int RemainingQuantity { get; set; }
    public DateOnly ReceivedDate { get; set; }
    public Guid? StockReceivingId { get; set; }
    public Guid? StockReceivingItemId { get; set; }
    public Guid? SupplierId { get; set; }
    public string? SupplierName { get; set; }
    public Guid? ReceivedByUserId { get; set; }
    public string? ReceivedByName { get; set; }
    public Guid? ApprovedByUserId { get; set; }
    public string? ApprovedByName { get; set; }
    public string Status { get; set; } = "Active";
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateProductBatchRequest
{
    public string? BatchCode { get; set; }
    public decimal CostPrice { get; set; }
    public decimal SellingPrice { get; set; }
    public int Quantity { get; set; }
    public DateOnly ReceivedDate { get; set; }
}

public class AdjustProductBatchRequest
{
    public int NewQuantity { get; set; }
    public string? Reason { get; set; }
}

public class BatchAllocationRequest
{
    public int Quantity { get; set; }
    public Guid? PreferredBatchId { get; set; }
}

public class BatchAllocationLineDto
{
    public Guid BatchId { get; set; }
    public string? BatchCode { get; set; }
    public int Quantity { get; set; }
    public decimal SellingPrice { get; set; }
    public decimal CostPrice { get; set; }
    public decimal Subtotal { get; set; }
}

public class BatchAllocationResultDto
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int RequestedQuantity { get; set; }
    public bool InsufficientStock { get; set; }
    public int AvailableTotal { get; set; }
    public bool NeedsWarning { get; set; }
    public int LowestPriceAvailable { get; set; }
    public decimal LowestPrice { get; set; }
    public string? WarningMessage { get; set; }
    public decimal Total { get; set; }
    public List<BatchAllocationLineDto> Lines { get; set; } = [];
    public List<AvailableBatchDto> AvailableBatches { get; set; } = [];
}

public class AvailableBatchDto
{
    public Guid BatchId { get; set; }
    public string? BatchCode { get; set; }
    public int RemainingQuantity { get; set; }
    public decimal SellingPrice { get; set; }
    public DateOnly ReceivedDate { get; set; }
}
