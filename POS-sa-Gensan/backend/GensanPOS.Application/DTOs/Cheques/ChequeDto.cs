using GensanPOS.Domain.Enums;

namespace GensanPOS.Application.DTOs.Cheques;

public class ChequeDto
{
    public Guid Id { get; set; }
    public Guid SaleId { get; set; }
    public string SaleNumber { get; set; } = string.Empty;
    public Guid? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public ChequeType Type { get; set; }
    public ChequeStatus Status { get; set; }
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
    public DateTime CreatedAt { get; set; }
}

public class BouncedChequeHistoryDto
{
    public Guid Id { get; set; }
    public Guid SaleChequeId { get; set; }
    public string ChequeNumber { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public string? Branch { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public Guid? CustomerId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime MaturityDate { get; set; }
    public DateTime BouncedDate { get; set; }
    public string Reason { get; set; } = string.Empty;
    public decimal PenaltyAmount { get; set; }
    public string ProcessedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class ChequePaymentRequest
{
    public ChequeType Type { get; set; }
    public string BankName { get; set; } = string.Empty;
    public string? Branch { get; set; }
    public string ChequeNumber { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public DateTime MaturityDate { get; set; }
    public string? Notes { get; set; }
}

public class UpdateChequeStatusRequest
{
    public ChequeStatus Status { get; set; }
    public string? Notes { get; set; }
    /// <summary>Required when marking bounced.</summary>
    public string? Reason { get; set; }
    /// <summary>Optional penalty (owner only) added to customer receivable.</summary>
    public decimal? PenaltyAmount { get; set; }
}

public class ChequesSummaryDto
{
    public int PendingCount { get; set; }
    public decimal PendingAmount { get; set; }
    public int PostDatedPendingCount { get; set; }
}
