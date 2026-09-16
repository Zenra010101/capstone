using GensanPOS.Domain.Common;

namespace GensanPOS.Domain.Entities;

/// <summary>Immutable record when a cheque/PDC is marked bounced.</summary>
public class BouncedChequeHistory : BaseEntity
{
    public Guid SaleChequeId { get; set; }
    public SaleCheque SaleCheque { get; set; } = null!;

    public string ChequeNumber { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public string? Branch { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public Guid? CustomerId { get; set; }
    public Customer? Customer { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime MaturityDate { get; set; }
    public DateTime BouncedDate { get; set; }
    public string Reason { get; set; } = string.Empty;
    public decimal PenaltyAmount { get; set; }
    public Guid ProcessedByUserId { get; set; }
    public User ProcessedByUser { get; set; } = null!;
    public Guid? CustomerReceivableId { get; set; }
    public CustomerReceivable? CustomerReceivable { get; set; }
}
