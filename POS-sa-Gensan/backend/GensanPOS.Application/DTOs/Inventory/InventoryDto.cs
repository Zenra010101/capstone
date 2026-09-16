using GensanPOS.Domain.Enums;

namespace GensanPOS.Application.DTOs.Inventory;

public class InventoryOnHandDto
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public Guid CategoryId { get; set; }
    public string UnitOfMeasure { get; set; } = "pc";
    public int StockQuantity { get; set; }
    public StockStatus StockStatus { get; set; }
    public string StockStatusLabel { get; set; } = string.Empty;
    public DateTime? LastMovementAt { get; set; }
    public decimal? CostPrice { get; set; }
    public decimal? InventoryValue { get; set; }
}

public class InventoryStockListLineDto
{
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public string BatchCode { get; set; } = string.Empty;
    public DateOnly ReceivedDate { get; set; }
    public int ReceivedQuantity { get; set; }
    public int RemainingQuantity { get; set; }
    public decimal CostPrice { get; set; }
    public decimal SellingPrice { get; set; }
    public decimal ValueAtCost { get; set; }
}

public class InventoryStockListReportDto
{
    public string PeriodLabel { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; }
    public string PrintedAtLabel { get; set; } = string.Empty;
    public string PrintedDateLabel { get; set; } = string.Empty;
    public decimal TotalValueAtCost { get; set; }
    public List<InventoryStockListLineDto> Lines { get; set; } = [];
}

public class InventorySummaryDto
{
    public int TotalUnits { get; set; }
    public int LowStockCount { get; set; }
    public int CriticalStockCount { get; set; }
    public int OutOfStockCount { get; set; }
    public int ActiveSkuCount { get; set; }
    public decimal? TotalInventoryValue { get; set; }
}

public class InventoryTransactionDto
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public InventoryTransactionType Type { get; set; }
    public string MovementTypeLabel { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public int StockBefore { get; set; }
    public int StockAfter { get; set; }
    public string? Reference { get; set; }
    public string? Reason { get; set; }
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public Guid? ProductBatchId { get; set; }
    public string? BatchCode { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class InventorySearchQuery
{
    public string? Search { get; set; }
    public Guid? ProductId { get; set; }
    public Guid? CategoryId { get; set; }
    public InventoryTransactionType? Type { get; set; }
    public Guid? UserId { get; set; }
    public string? Reference { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public bool? LowStockOnly { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}

public class AdjustInventoryRequest
{
    public Guid ProductId { get; set; }
    public InventoryTransactionType Type { get; set; }
    public int Quantity { get; set; }
    public string? Notes { get; set; }
}
