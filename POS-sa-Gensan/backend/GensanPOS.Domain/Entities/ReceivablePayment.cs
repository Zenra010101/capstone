using GensanPOS.Domain.Common;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Domain.Entities;

public class ReceivablePayment : BaseEntity
{
    public Guid CustomerReceivableId { get; set; }
    public CustomerReceivable CustomerReceivable { get; set; } = null!;
    public decimal Amount { get; set; }
    public decimal BalanceBefore { get; set; }
    public decimal BalanceAfter { get; set; }
    public DateTime PaymentDate { get; set; }
    public PaymentMethod? PaymentMethod { get; set; }
    public string? Reference { get; set; }
    public string? Notes { get; set; }
    /// <summary>Return/credit — reduces balance without cash received.</summary>
    public bool IsCredit { get; set; }
    /// <summary>Cheque payment awaiting clearance — does not reduce balance until cleared.</summary>
    public bool IsChequePending { get; set; }
    /// <summary>Voided (e.g. bounced cheque) — excluded from balance and collections.</summary>
    public bool IsVoided { get; set; }
    public Guid? SaleChequeId { get; set; }
    public SaleCheque? SaleCheque { get; set; }
    public Guid? GoodsReturnSlipId { get; set; }
    public GoodsReturnSlip? GoodsReturnSlip { get; set; }
    public Guid RecordedByUserId { get; set; }
    public User RecordedByUser { get; set; } = null!;
}
