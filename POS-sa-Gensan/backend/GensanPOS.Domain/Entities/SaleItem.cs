using GensanPOS.Domain.Common;

namespace GensanPOS.Domain.Entities;

public class SaleItem : BaseEntity
{
    public Guid SaleId { get; set; }
    public Sale Sale { get; set; } = null!;
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public Guid? ProductBatchId { get; set; }
    public ProductBatch? ProductBatch { get; set; }
    public string? BatchCodeAtSale { get; set; }
    public DateOnly? BatchReceivedDate { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public int Quantity { get; set; }
    /// <summary>Selling unit price at time of sale (same as SellingPriceAtSale).</summary>
    public decimal UnitPrice { get; set; }
    public decimal SellingPriceAtSale { get; set; }
    public decimal CostPriceAtSale { get; set; }
    public decimal ProfitAmount { get; set; }
    public decimal Discount { get; set; }
    public decimal LineTotal { get; set; }
    public int ReturnedQuantity { get; set; }
    /// <summary>Qty reserved by GRS in PendingInspection (exchange-era).</summary>
    public int PendingReturnQuantity { get; set; }
}
