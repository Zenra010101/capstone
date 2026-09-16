using GensanPOS.Application.DTOs.Cheques;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Application.DTOs.Sales;

public class SaleListItemDto
{
    public Guid Id { get; set; }
    public string SaleNumber { get; set; } = string.Empty;
    public string CashierName { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public decimal GrossProfit { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public SaleStatus Status { get; set; }
    public string? CustomerName { get; set; }
    public string TaxTypeLabel { get; set; } = string.Empty;
    public decimal TaxAmount { get; set; }
    public bool IsArchived { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SaleDto
{
    public Guid Id { get; set; }
    public string SaleNumber { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public string CashierName { get; set; } = string.Empty;
    public decimal SubTotal { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal DiscountAmount { get; set; }
    public SaleTaxMode TaxMode { get; set; }
    public string TaxTypeLabel { get; set; } = string.Empty;
    public decimal TaxRate { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal WithholdingAmount { get; set; }
    public string? ManualTaxName { get; set; }
    public bool ManualTaxIsPercent { get; set; }
    public decimal ManualTaxValue { get; set; }
    public bool ManualTaxIsDeduction { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal GrossProfit { get; set; }
    public decimal AmountPaid { get; set; }
    public decimal ChangeAmount { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public SaleStatus Status { get; set; }
    public bool IsArchived { get; set; }
    public string? CustomerName { get; set; }
    public DateTime? DueDate { get; set; }
    public int? TermsDays { get; set; }
    public Guid? ReceivableId { get; set; }
    public decimal? ReceivableBalance { get; set; }
    public string? VoidReason { get; set; }
    public DateTime? VoidedAt { get; set; }
    public string? VoidedByName { get; set; }
    public Guid? ReplacesSaleId { get; set; }
    public string? ReplacesSaleNumber { get; set; }
    /// <summary>True when this invoice is the cash/QR top-up from a goods exchange.</summary>
    public bool IsExchangeTopUp { get; set; }
    public string? ExchangeNumber { get; set; }
    public string? GrsNumber { get; set; }
    public decimal? ReturnCreditTotal { get; set; }
    public Guid? ReplacedBySaleId { get; set; }
    public string? ReplacedBySaleNumber { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<SaleItemDto> Items { get; set; } = [];
    public SalePaymentDto? Payment { get; set; }
    public SaleChequeDto? Cheque { get; set; }
    /// <summary>Tender breakdown for split payments; empty for single-method sales.</summary>
    public List<SalePaymentDto> Payments { get; set; } = [];
}

public class SalePaymentDto
{
    public PaymentMethod Method { get; set; }
    public decimal Amount { get; set; }
    public string? QrphReference { get; set; }
    public string? BankName { get; set; }
    public string? BankBranch { get; set; }
    public string? BankReferenceNumber { get; set; }
    public string? SenderName { get; set; }
    public DateTime? DatePaid { get; set; }
}

public class SaleChequeDto
{
    public Guid Id { get; set; }
    public ChequeType Type { get; set; }
    public ChequeStatus Status { get; set; }
    public string BankName { get; set; } = string.Empty;
    public string? Branch { get; set; }
    public string ChequeNumber { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime MaturityDate { get; set; }
    public DateTime? ClearedAt { get; set; }
}

public class SaleItemDto
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public Guid? ProductBatchId { get; set; }
    public string? BatchCode { get; set; }
    public DateOnly? BatchReceivedDate { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public int ReturnedQuantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal SellingPriceAtSale { get; set; }
    public decimal CostPriceAtSale { get; set; }
    public decimal ProfitAmount { get; set; }
    public decimal Discount { get; set; }
    public decimal LineTotal { get; set; }
}

public class CreateSaleItemRequest
{
    public Guid ProductId { get; set; }
    public Guid? ProductBatchId { get; set; }
    public int Quantity { get; set; }
    public decimal Discount { get; set; }
}

public class OnlineBankPaymentRequest
{
    public string BankName { get; set; } = string.Empty;
    /// <summary>Branch name or street address where the transfer was made.</summary>
    public string Branch { get; set; } = string.Empty;
    public string ReferenceNumber { get; set; } = string.Empty;
    public string SenderName { get; set; } = string.Empty;
    public DateTime? DatePaid { get; set; }
}

public class CreateSaleRequest
{
    public List<CreateSaleItemRequest> Items { get; set; } = [];
    public decimal DiscountPercent { get; set; }
    public SaleTaxMode TaxMode { get; set; }
    public string? ManualTaxName { get; set; }
    public bool ManualTaxIsPercent { get; set; }
    public decimal ManualTaxValue { get; set; }
    public bool ManualTaxIsDeduction { get; set; }
    public decimal AmountPaid { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public string? QrphReference { get; set; }
    public OnlineBankPaymentRequest? OnlineBank { get; set; }
    public string? CustomerName { get; set; }
    public Guid? CustomerId { get; set; }
    public DateTime? DueDate { get; set; }
    public ChequePaymentRequest? Cheque { get; set; }
    public string? Notes { get; set; }
    /// <summary>When set (2+ entries), the sale is settled with multiple tenders.
    /// The flat PaymentMethod/AmountPaid/Cheque/OnlineBank fields above are ignored.</summary>
    public List<CreateSalePaymentLineRequest>? Payments { get; set; }
}

public class CreateSalePaymentLineRequest
{
    public PaymentMethod Method { get; set; }
    public decimal Amount { get; set; }
    public string? QrphReference { get; set; }
    public OnlineBankPaymentRequest? OnlineBank { get; set; }
    public ChequePaymentRequest? Cheque { get; set; }
    /// <summary>Required for the Charged tender line: when the credit portion is due.</summary>
    public DateTime? DueDate { get; set; }
}
