using GensanPOS.Domain.Common;
using GensanPOS.Domain.Enums;
namespace GensanPOS.Domain.Entities;

public class Sale : BaseEntity
{
    public string SaleNumber { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public decimal SubTotal { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal DiscountAmount { get; set; }
    public SaleTaxMode TaxMode { get; set; }
    public string TaxTypeLabel { get; set; } = "No Tax";
    public decimal TaxRate { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal WithholdingAmount { get; set; }
    public string? ManualTaxName { get; set; }
    public bool ManualTaxIsPercent { get; set; }
    public decimal ManualTaxValue { get; set; }
    public bool ManualTaxIsDeduction { get; set; }
    public decimal TotalAmount { get; set; }
    /// <summary>Sum of line ProfitAmount at checkout (pre-tax merchandise margin).</summary>
    public decimal GrossProfit { get; set; }
    public decimal AmountPaid { get; set; }
    public decimal ChangeAmount { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    /// <summary>JSON breakdown of tenders when PaymentMethod is Split; null for single-method sales.</summary>
    public string? SplitPaymentsJson { get; set; }
    public SaleStatus Status { get; set; } = SaleStatus.Completed;
    /// <summary>Soft-archive for reporting; record is never hard-deleted.</summary>
    public bool IsArchived { get; set; }
    public string? CustomerName { get; set; }
    public Guid? CustomerId { get; set; }
    public Customer? Customer { get; set; }
    public CustomerReceivable? Receivable { get; set; }
    public string? Notes { get; set; }
    public string? VoidReason { get; set; }
    public DateTime? VoidedAt { get; set; }
    public Guid? VoidedByUserId { get; set; }
    public User? VoidedByUser { get; set; }
    public Guid? ReplacesSaleId { get; set; }
    public Sale? ReplacesSale { get; set; }
    public Guid? ReplacedBySaleId { get; set; }
    public Sale? ReplacedBySale { get; set; }
    public ICollection<SaleItem> Items { get; set; } = [];
    public SalePayment? Payment { get; set; }
    public SaleCheque? Cheque { get; set; }
    public ICollection<GoodsReturnSlip> GoodsReturnSlips { get; set; } = [];
}
