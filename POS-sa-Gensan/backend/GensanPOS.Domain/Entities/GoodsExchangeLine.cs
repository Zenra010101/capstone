using GensanPOS.Domain.Common;

namespace GensanPOS.Domain.Entities;

public class GoodsExchangeLine : BaseEntity
{
    public Guid GoodsExchangeId { get; set; }
    public GoodsExchange GoodsExchange { get; set; } = null!;
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    /// <summary>Weighted average FIFO/batch cost per unit at exchange time.</summary>
    public decimal CostPriceAtSale { get; set; }
    /// <summary>Line margin locked at exchange (LineTotal − cost × qty).</summary>
    public decimal ProfitAmount { get; set; }
}
