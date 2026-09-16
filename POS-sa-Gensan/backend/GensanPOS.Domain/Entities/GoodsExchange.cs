using GensanPOS.Domain.Common;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Domain.Entities;

/// <summary>Return-and-replace exchange linked to a GRS (no cash refund).</summary>
public class GoodsExchange : BaseEntity
{
    public Guid GoodsReturnSlipId { get; set; }
    public GoodsReturnSlip GoodsReturnSlip { get; set; } = null!;
    public string ExchangeNumber { get; set; } = string.Empty;
    public decimal ReturnCreditTotal { get; set; }
    public decimal ReplacementTotal { get; set; }
    public decimal AmountPaid { get; set; }
    public PaymentMethod? PaymentMethod { get; set; }
    public Guid? TopUpSaleId { get; set; }
    public Sale? TopUpSale { get; set; }
    public DateTime CompletedAt { get; set; }
    public Guid CompletedByUserId { get; set; }
    public User CompletedByUser { get; set; } = null!;
    public ICollection<GoodsExchangeLine> Lines { get; set; } = [];
}
