using GensanPOS.Domain.Common;

namespace GensanPOS.Domain.Entities;

public class StockReceivingItem : BaseEntity
{
    public Guid StockReceivingId { get; set; }
    public StockReceiving StockReceiving { get; set; } = null!;
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public int Quantity { get; set; }
    public int? ExpectedQuantity { get; set; }
    public decimal CostPrice { get; set; }
    public decimal SellingPrice { get; set; }
    public string? Remarks { get; set; }
}
