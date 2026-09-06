using GensanPOS.Domain.Common;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Domain.Entities;

public class GoodsReturnSlip : BaseEntity
{
    public string GrsNumber { get; set; } = string.Empty;
    public Guid OriginalSaleId { get; set; }
    public Sale OriginalSale { get; set; } = null!;
    public string OriginalInvoiceNumber { get; set; } = string.Empty;
    public string? CustomerName { get; set; }
    public DateTime OriginalSaleDate { get; set; }
    public Guid ProcessedByUserId { get; set; }
    public User ProcessedByUser { get; set; } = null!;
    public DateTime ReturnDate { get; set; }
    public decimal TotalReturnAmount { get; set; }
    public string Reason { get; set; } = string.Empty;
    /// <summary>Cashier attestation: operational resellable return (wrong item/size/spec), not defective/warranty.</summary>
    public bool GoodConditionConfirmed { get; set; }
    public GrsRefundMethod RefundMethod { get; set; }
    public GrsWorkflowKind WorkflowKind { get; set; } = GrsWorkflowKind.LegacyRefund;
    public GrsStatus Status { get; set; } = GrsStatus.Completed;
    public string? Notes { get; set; }

    public DateTime? SubmittedAt { get; set; }
    public Guid? SubmittedByUserId { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public Guid? ApprovedByUserId { get; set; }
    public string? ApprovalNotes { get; set; }
    public DateTime? RejectedAt { get; set; }
    public Guid? RejectedByUserId { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime? StockRestoredAt { get; set; }
    public Guid? GoodsExchangeId { get; set; }
    public GoodsExchange? GoodsExchange { get; set; }
    public bool IsArchived { get; set; }
    public DateTime? VoidedAt { get; set; }
    public Guid? VoidedByUserId { get; set; }
    public User? VoidedByUser { get; set; }
    public string? VoidReason { get; set; }
    public ICollection<GoodsReturnSlipItem> Items { get; set; } = [];
    public SalesReturnDeduction? SalesDeduction { get; set; }
}
