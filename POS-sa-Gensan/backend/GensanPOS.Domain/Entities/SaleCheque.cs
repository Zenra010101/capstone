using GensanPOS.Domain.Common;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Domain.Entities;

public class SaleCheque : BaseEntity
{
    public Guid SaleId { get; set; }
    public Sale Sale { get; set; } = null!;
    public ChequeType Type { get; set; }
    public ChequeStatus Status { get; set; } = ChequeStatus.Pending;
    public string BankName { get; set; } = string.Empty;
    public string? Branch { get; set; }
    public string ChequeNumber { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime MaturityDate { get; set; }
    public DateTime? ClearedAt { get; set; }
    public DateTime? BouncedAt { get; set; }
    public string? BounceReason { get; set; }
    public string? Notes { get; set; }

    public Guid? CustomerReceivableId { get; set; }
    public CustomerReceivable? CustomerReceivable { get; set; }

    /// <summary>When cleared, links to the receivable payment that applied funds.</summary>
    public Guid? ClearedReceivablePaymentId { get; set; }
    public ReceivablePayment? ClearedReceivablePayment { get; set; }

    /// <summary>When this cheque was given against an existing utang invoice (not a full cheque sale).</summary>
    public Guid? ReceivablePaymentId { get; set; }
    public ReceivablePayment? ReceivablePayment { get; set; }

    public Guid? ProcessedByUserId { get; set; }
    public User? ProcessedByUser { get; set; }
}
