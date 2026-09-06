using GensanPOS.Domain.Common;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Domain.Entities;

public class SalePayment : BaseEntity
{
    public Guid SaleId { get; set; }
    public Sale Sale { get; set; } = null!;
    public PaymentMethod Method { get; set; }
    public decimal Amount { get; set; }
    public string? QrphReference { get; set; }
    public string? BankName { get; set; }
    /// <summary>Bank branch name or address (online bank transfers).</summary>
    public string? BankBranch { get; set; }
    public string? BankReferenceNumber { get; set; }
    public string? SenderName { get; set; }
    public DateTime? DatePaid { get; set; }
}
