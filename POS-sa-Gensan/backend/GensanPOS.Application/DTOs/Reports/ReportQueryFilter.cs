using GensanPOS.Application.Common;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Application.DTOs.Reports;

public class ReportQueryFilter
{
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public Guid? CashierId { get; set; }
    public Guid? CategoryId { get; set; }
    public Guid? ProductId { get; set; }
    public Guid? SupplierId { get; set; }
    public Guid? CustomerId { get; set; }
    public PaymentMethod? PaymentMethod { get; set; }
    public bool IncludeArchived { get; set; }
    public bool IncludeVoided { get; set; }
    /// <summary>yearly | monthly | custom (default)</summary>
    public string? Period { get; set; }
}

public enum ReportTypeKind
{
    Sales = 0,
    Profit = 1,
    Inventory = 2,
    InventoryMovement = 3,
    Receivables = 4,
    Tax = 5,
    Voids = 6,
    Grs = 7,
    Audit = 8,
    StockReceiving = 9
}

public class ReportSummaryDto
{
    public ReportTypeKind ReportType { get; set; }
    public DateTime From { get; set; }
    public DateTime To { get; set; }
    public Dictionary<string, decimal> Totals { get; set; } = new();
    public Dictionary<string, int> Counts { get; set; } = new();
    public List<PaymentMethodSummaryDto> PaymentBreakdown { get; set; } = [];
    public List<ProfitByDayDto> DailyTrend { get; set; } = [];
    public List<ProfitByProductDto> TopProducts { get; set; } = [];
}

public class UnifiedReportDto
{
    public ReportSummaryDto Summary { get; set; } = new();
    public PagedResult<SalesReportRowDto> SalesRows { get; set; } = new();
    public PagedResult<InventoryMovementRowDto> MovementRows { get; set; } = new();
    public PagedResult<ReceivableReportRowDto> ReceivableRows { get; set; } = new();
    public PagedResult<TaxReportRowDto> TaxRows { get; set; } = new();
    public PagedResult<VoidReportRowDto> VoidRows { get; set; } = new();
    public PagedResult<GrsReportRowDto> GrsRows { get; set; } = new();
    public PagedResult<InventorySnapshotRowDto> InventoryRows { get; set; } = new();
    public ProfitReportDto? ProfitDetail { get; set; }
    public PagedResult<StockReceivingReportRowDto> StockReceivingRows { get; set; } = new();
    public PagedResult<AuditReportRowDto> AuditRows { get; set; } = new();
}

public class StockReceivingReportRowDto
{
    public string ReceivingNumber { get; set; } = string.Empty;
    public string SupplierName { get; set; } = string.Empty;
    public DateTime DeliveryDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public int ItemCount { get; set; }
    public bool IsArchived { get; set; }
}

public class AuditReportRowDto
{
    public Guid Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public string? UserEmail { get; set; }
    public string? Details { get; set; }
    public bool IsArchived { get; set; }
}

public class InventoryMovementRowDto
{
    public Guid Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public int StockBefore { get; set; }
    public int StockAfter { get; set; }
    public string? Reference { get; set; }
    public string? UserName { get; set; }
}

public class ReceivableReportRowDto
{
    public string SaleNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public DateTime DueDate { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal RemainingBalance { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsArchived { get; set; }
}

public class TaxReportRowDto
{
    public string SaleNumber { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string TaxTypeLabel { get; set; } = string.Empty;
    public decimal TaxRate { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal WithholdingAmount { get; set; }
    public decimal TotalAmount { get; set; }
}

public class VoidReportRowDto
{
    public string SaleNumber { get; set; } = string.Empty;
    public DateTime VoidedAt { get; set; }
    public string CashierName { get; set; } = string.Empty;
    public string? VoidReason { get; set; }
    public decimal TotalAmount { get; set; }
}

public class GrsReportRowDto
{
    public string GrsNumber { get; set; } = string.Empty;
    public string SaleNumber { get; set; } = string.Empty;
    public string? CustomerName { get; set; }
    public DateTime ReturnDate { get; set; }
    public DateTime OriginalSaleDate { get; set; }
    public decimal TotalReturnAmount { get; set; }
    public string Reason { get; set; } = string.Empty;
    public GrsRefundMethod RefundMethod { get; set; }
    public GrsStatus Status { get; set; }
    public string ProcessedByName { get; set; } = string.Empty;
    public bool IsArchived { get; set; }
}

public class InventorySnapshotRowDto
{
    public string Sku { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int StockQuantity { get; set; }
    public int ReorderLevel { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal CostPrice { get; set; }
    public bool IsActive { get; set; }
}
