using GensanPOS.Application.DTOs.Cheques;
using GensanPOS.Application.DTOs.Receivables;
using GensanPOS.Application.DTOs.Sales;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Application.DTOs.Customers;

public class CustomerDto
{
    public Guid Id { get; set; }
    public string CustomerCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }
    public CustomerType CustomerType { get; set; }
    public bool EnableCredit { get; set; }
    public decimal CreditLimit { get; set; }
    public SupplierPaymentTerms PaymentTerms { get; set; }
    public string PaymentTermsLabel { get; set; } = string.Empty;
    public int DueDays { get; set; }
    public string? CustomPaymentTerms { get; set; }
    public bool AllowCheque { get; set; }
    public decimal OutstandingBalance { get; set; }
    public bool IsActive { get; set; }
    public bool IsBlacklisted { get; set; }
    public CustomerAccountStatus Status { get; set; }
    public bool IsOverCreditLimit { get; set; }
    public DateTime? LastPurchaseDate { get; set; }
    public DateTime? LastPaymentDate { get; set; }
    public decimal TotalPurchases { get; set; }
    public int OverdueCount { get; set; }
    public bool HasBouncedCheque { get; set; }
    public int BouncedChequeCount { get; set; }
    public DateTime? LastBouncedDate { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateCustomerRequest
{
    public string? CustomerCode { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }
    public CustomerType CustomerType { get; set; } = CustomerType.WalkIn;
    public bool EnableCredit { get; set; }
    public decimal CreditLimit { get; set; }
    public SupplierPaymentTerms PaymentTerms { get; set; } = SupplierPaymentTerms.Cod;
    public int DueDays { get; set; }
    public string? CustomPaymentTerms { get; set; }
    public bool AllowCheque { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsBlocked { get; set; }
    public bool IsBlacklisted { get; set; }
}

public class UpdateCustomerRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }
    public CustomerType CustomerType { get; set; }
    public bool EnableCredit { get; set; }
    public decimal CreditLimit { get; set; }
    public SupplierPaymentTerms PaymentTerms { get; set; }
    public int DueDays { get; set; }
    public string? CustomPaymentTerms { get; set; }
    public bool AllowCheque { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsBlocked { get; set; }
    public bool IsBlacklisted { get; set; }
}

public class NextCustomerCodeDto
{
    public string CustomerCode { get; set; } = string.Empty;
}

public class CustomerProfileDto
{
    public CustomerDto Customer { get; set; } = null!;
    public decimal TotalOutstanding { get; set; }
    public decimal OverdueAmount { get; set; }
    public int OpenReceivableCount { get; set; }
    public IReadOnlyList<ReceivableDto> Receivables { get; set; } = [];
    public IReadOnlyList<ReceivablePaymentDto> RecentPayments { get; set; } = [];
    public IReadOnlyList<CustomerSaleSummaryDto> RecentSales { get; set; } = [];
    public IReadOnlyList<CustomerChequeSummaryDto> Cheques { get; set; } = [];
    public IReadOnlyList<BouncedChequeHistoryDto> BouncedCheques { get; set; } = [];
}

public class CustomerSaleSummaryDto
{
    public Guid Id { get; set; }
    public string SaleNumber { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public decimal TotalAmount { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public SaleStatus Status { get; set; }
    public string CashierName { get; set; } = string.Empty;
}

public class CustomerChequeSummaryDto
{
    public string SaleNumber { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public string ChequeNumber { get; set; } = string.Empty;
    public DateTime MaturityDate { get; set; }
    public ChequeStatus Status { get; set; }
    public decimal SaleTotal { get; set; }
}

public class CustomerLedgerQuery
{
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public bool UnpaidOnly { get; set; }
    public bool OverdueOnly { get; set; }
    public PaymentMethod? PaymentMethod { get; set; }
    public string? Invoice { get; set; }
}

public class CustomerLedgerDetailDto
{
    public Guid? CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public decimal CurrentBalance { get; set; }
    public decimal TotalPurchases { get; set; }
    public decimal TotalPayments { get; set; }
    public decimal OverdueAmount { get; set; }
    public List<CustomerLedgerEntryDto> Entries { get; set; } = [];
}

public class CustomerLedgerEntryDto
{
    public DateTime Date { get; set; }
    public string Type { get; set; } = string.Empty;
    public string InvoiceNumber { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public decimal RunningBalance { get; set; }
    public string? PaymentMethod { get; set; }
    public string? ProcessedBy { get; set; }
}
