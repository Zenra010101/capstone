using GensanPOS.Domain.Common;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Domain.Entities;

public class GoodsReturnSlipItem : BaseEntity
{
    public Guid GoodsReturnSlipId { get; set; }
    public GoodsReturnSlip GoodsReturnSlip { get; set; } = null!;
    public Guid SaleItemId { get; set; }
    public SaleItem SaleItem { get; set; } = null!;
    public Guid? ProductBatchId { get; set; }
    public string? BatchCode { get; set; }
    public DateOnly? BatchReceivedDate { get; set; }
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal SellingPriceAtSale { get; set; }
    public decimal CostPriceAtSale { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    public ReturnItemCondition Condition { get; set; } = ReturnItemCondition.Good;
}
