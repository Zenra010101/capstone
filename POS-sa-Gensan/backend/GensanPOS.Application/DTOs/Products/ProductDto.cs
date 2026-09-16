using GensanPOS.Domain.Constants;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Application.DTOs.Products;

public class ProductDto
{
    public Guid Id { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Barcode { get; set; }
    public string? Size { get; set; }
    public string? Thickness { get; set; }
    public string? Length { get; set; }
    public string? Grade { get; set; }
    public string? Diameter { get; set; }
    public string? Schedule { get; set; }
    public string? Width { get; set; }
    public string? Height { get; set; }
    public string? MaterialType { get; set; }
    public string Specification { get; set; } = string.Empty;
    public string UnitOfMeasure { get; set; } = "pc";
    public decimal UnitPrice { get; set; }
    public decimal? CostPrice { get; set; }
    public decimal? InventoryValue { get; set; }
    public decimal? MarginPercent { get; set; }
    public int StockQuantity { get; set; }
    public int ReorderLevel { get; set; }
    public StockStatus StockStatus { get; set; }
    public string StockStatusLabel { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public Guid CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public Guid? SupplierId { get; set; }
    public string? SupplierName { get; set; }
    public bool IsLowStock { get; set; }
}

public class ProductSummaryDto
{
    public int TotalProducts { get; set; }
    public int ActiveProducts { get; set; }
    public int LowStockCount { get; set; }
    public int CriticalStockCount { get; set; }
    public int OutOfStockCount { get; set; }
    public int MissingBarcodeCount { get; set; }
    public decimal? TotalInventoryValue { get; set; }
}

public class BulkGenerateBarcodeResultDto
{
    public int GeneratedCount { get; set; }
}

public class ProductPriceHistoryDto
{
    public DateTime ChangedAt { get; set; }
    public string? ChangedBy { get; set; }
    public string Field { get; set; } = string.Empty;
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string? Details { get; set; }
}

public class ProductMovementDto
{
    public Guid Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public string MovementType { get; set; } = string.Empty;
    public string? ReferenceNumber { get; set; }
    public int QuantityChange { get; set; }
    public int RunningBalance { get; set; }
    public string? ProcessedBy { get; set; }
    public string? Notes { get; set; }
}

public class ProductSaleHistoryDto
{
    public Guid SaleId { get; set; }
    public string SaleNumber { get; set; } = string.Empty;
    public DateTime SaleDate { get; set; }
    public string CashierName { get; set; } = string.Empty;
    public SaleStatus Status { get; set; }
    public string StatusLabel { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    public decimal? CostPriceAtSale { get; set; }
    public decimal? LineProfit { get; set; }
}

public class ProductReceivingHistoryDto
{
    public Guid ReceivingId { get; set; }
    public string ReceivingNumber { get; set; } = string.Empty;
    public string SupplierName { get; set; } = string.Empty;
    public StockReceivingStatus Status { get; set; }
    public string StatusLabel { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string? ReferenceNumber { get; set; }
    public string RequestedByName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal? CostPrice { get; set; }
    public decimal? LineCost { get; set; }
}

public class CreateProductRequest
{
    public string Sku { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Barcode { get; set; }
    public string? Size { get; set; }
    public string? Thickness { get; set; }
    public string? Length { get; set; }
    public string? Grade { get; set; }
    public string? Diameter { get; set; }
    public string? Schedule { get; set; }
    public string? Width { get; set; }
    public string? Height { get; set; }
    public string? MaterialType { get; set; }
    public Guid? SupplierId { get; set; }
    public string UnitOfMeasure { get; set; } = "pc";
    public decimal UnitPrice { get; set; }
    public decimal CostPrice { get; set; }
    public int StockQuantity { get; set; }
    public int ReorderLevel { get; set; } = InventoryConstants.DefaultReorderLevel;
    public Guid CategoryId { get; set; }
}

public class UpdateProductRequest
{
    public string Sku { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Barcode { get; set; }
    public string? Size { get; set; }
    public string? Thickness { get; set; }
    public string? Length { get; set; }
    public string? Grade { get; set; }
    public string? Diameter { get; set; }
    public string? Schedule { get; set; }
    public string? Width { get; set; }
    public string? Height { get; set; }
    public string? MaterialType { get; set; }
    public Guid? SupplierId { get; set; }
    public string UnitOfMeasure { get; set; } = "pc";
    public decimal UnitPrice { get; set; }
    public decimal CostPrice { get; set; }
    public int ReorderLevel { get; set; }
    public bool IsActive { get; set; }
    public Guid CategoryId { get; set; }
}

public class GenerateBarcodeResponse
{
    public string Barcode { get; set; } = string.Empty;
}
