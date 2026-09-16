using GensanPOS.Application.DTOs.Cheques;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Application.DTOs.Receivables;

public class ReceivableDto
{
    public Guid Id { get; set; }
    public Guid SaleId { get; set; }
    public string SaleNumber { get; set; } = string.Empty;
    public Guid? CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal RemainingBalance { get; set; }
    public DateTime DueDate { get; set; }
    public ReceivableStatus Status { get; set; }
    public int DaysOverdue { get; set; }
    public DateTime? LastPaymentDate { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<ReceivablePaymentDto> Payments { get; set; } = [];
}

public class ReceivablePaymentDto
{
    public Guid Id { get; set; }
    public decimal Amount { get; set; }
    public decimal BalanceBefore { get; set; }
    public decimal BalanceAfter { get; set; }
    public DateTime PaymentDate { get; set; }
    public PaymentMethod? PaymentMethod { get; set; }
    public string? Reference { get; set; }
    public string? Notes { get; set; }
    public bool IsCredit { get; set; }
    public string RecordedByName { get; set; } = string.Empty;
    public string? InvoiceNumber { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class RecordReceivablePaymentRequest
{
    public decimal Amount { get; set; }
    public DateTime? PaymentDate { get; set; }
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;
    public string? Reference { get; set; }
    public string? Notes { get; set; }
    public ChequePaymentRequest? Cheque { get; set; }
}

public class ReceivableListQuery
{
    public ReceivableStatus? Status { get; set; }
    public bool? OverdueOnly { get; set; }
    public bool? OpenOnly { get; set; }
    public Guid? CustomerId { get; set; }
    public string? CustomerSearch { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public int? Page { get; set; }
    public int PageSize { get; set; } = 50;
}

public class ReceivablesSummaryDto
{
    public decimal TotalOutstanding { get; set; }
    public decimal CollectedToday { get; set; }
    public decimal OverdueAmount { get; set; }
    public int ActiveCustomersWithBalance { get; set; }
    public int UnpaidCount { get; set; }
    public int PartialCount { get; set; }
    public int OverdueCount { get; set; }
    public List<ReceivableDto> OverdueReceivables { get; set; } = [];
}

public class CustomerLedgerDto
{
    public Guid? CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public decimal TotalOutstanding { get; set; }
    public List<Customers.CustomerLedgerEntryDto> Entries { get; set; } = [];
}

public class StatementOfAccountDto
{
    public Guid? CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public DateTime StatementDate { get; set; }
    public decimal TotalOutstanding { get; set; }
    public decimal OverdueAmount { get; set; }
    public List<StatementInvoiceLineDto> OpenInvoices { get; set; } = [];
    public List<ReceivablePaymentDto> RecentPayments { get; set; } = [];
}

public class StatementInvoiceLineDto
{
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime SaleDate { get; set; }
    public DateTime DueDate { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal RemainingBalance { get; set; }
    public int DaysOverdue { get; set; }
    public ReceivableStatus Status { get; set; }
}
