using GensanPOS.Domain.Enums;

namespace GensanPOS.Application.DTOs.Returns;

public class GoodsReturnSlipDto
{
    public Guid Id { get; set; }
    public string GrsNumber { get; set; } = string.Empty;
    public Guid OriginalSaleId { get; set; }
    public string OriginalSaleNumber { get; set; } = string.Empty;
    /// <summary>Full name of the user who created the original sale (POS cashier / owner).</summary>
    public string OriginalSaleCashierName { get; set; } = string.Empty;
    public string? CustomerName { get; set; }
    public DateTime OriginalSaleDate { get; set; }
    public string ProcessedByName { get; set; } = string.Empty;
    public Guid ProcessedByUserId { get; set; }
    public DateTime ReturnDate { get; set; }
    public decimal TotalReturnAmount { get; set; }
    public string Reason { get; set; } = string.Empty;
    public bool GoodConditionConfirmed { get; set; }
    public GrsRefundMethod RefundMethod { get; set; }
    public GrsWorkflowKind WorkflowKind { get; set; }
    public GrsStatus Status { get; set; }
    public string StatusLabel { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? ApprovalNotes { get; set; }
    public DateTime? RejectedAt { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime? StockRestoredAt { get; set; }
    public bool AwaitingExchange { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? VoidedAt { get; set; }
    public string? VoidedByName { get; set; }
    public string? VoidReason { get; set; }
    public int TotalQuantity { get; set; }
    public string ItemsSummary { get; set; } = string.Empty;
    public List<GoodsReturnSlipItemDto> Items { get; set; } = [];
    public GoodsExchangeDto? Exchange { get; set; }
}

public class GoodsExchangeDto
{
    public Guid Id { get; set; }
    public string ExchangeNumber { get; set; } = string.Empty;
    public decimal ReturnCreditTotal { get; set; }
    public decimal ReplacementTotal { get; set; }
    public decimal AmountPaid { get; set; }
    public PaymentMethod? PaymentMethod { get; set; }
    public string? TopUpSaleNumber { get; set; }
    public DateTime CompletedAt { get; set; }
    public List<GoodsExchangeLineDto> Lines { get; set; } = [];
}

public class GoodsExchangeLineDto
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
}

public class GoodsReturnSlipItemDto
{
    public Guid Id { get; set; }
    public Guid SaleItemId { get; set; }
    public Guid? ProductBatchId { get; set; }
    public string? BatchCode { get; set; }
    public DateOnly? BatchReceivedDate { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal SellingPriceAtSale { get; set; }
    public decimal CostPriceAtSale { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal ReturnAmount { get; set; }
    public ReturnItemCondition Condition { get; set; }
}

public class GoodsReturnSlipListQuery
{
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public Guid? ProcessedByUserId { get; set; }
    public string? Customer { get; set; }
    public string? Invoice { get; set; }
    public GrsStatus? Status { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public bool IncludeArchived { get; set; }
}

public class CreateGoodsReturnSlipRequest
{
    public Guid OriginalSaleId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public bool GoodConditionConfirmed { get; set; }
    public GrsRefundMethod? RefundMethod { get; set; }
    public string? Notes { get; set; }
    public List<CreateGoodsReturnSlipItemRequest> Items { get; set; } = [];
    /// <summary>Replacement products (required when completing exchange on legacy path).</summary>
    public List<CreateGoodsExchangeReplacementRequest> ReplacementItems { get; set; } = [];
    /// <summary>Payment for replacement total minus return credit (when &gt; 0).</summary>
    public PaymentMethod? ExchangePaymentMethod { get; set; }
    public decimal? ExchangeAmountPaid { get; set; }
    public string? QrphReference { get; set; }
    public string? BankName { get; set; }
    public string? BankReference { get; set; }
}

public class CreateGoodsExchangeReplacementRequest
{
    public Guid ProductId { get; set; }
    public int Quantity { get; set; }
}

public class CreateGoodsReturnSlipItemRequest
{
    public Guid SaleItemId { get; set; }
    public int Quantity { get; set; }
    /// <summary>Must be <see cref="ReturnItemCondition.Good"/> (operational resellable return per store policy).</summary>
    public ReturnItemCondition Condition { get; set; } = ReturnItemCondition.Good;
}

public class VoidGoodsReturnSlipRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class ApproveGoodsReturnSlipRequest
{
    public string? ApprovalNotes { get; set; }
}

public class RejectGoodsReturnSlipRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class CancelGoodsReturnSlipRequest
{
    public string? Reason { get; set; }
}

public class SaleForReturnDto
{
    public Guid Id { get; set; }
    public string SaleNumber { get; set; } = string.Empty;
    public string CashierName { get; set; } = string.Empty;
    public string? CustomerName { get; set; }
    public decimal TotalAmount { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public decimal? ReceivableBalance { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<SaleItemForReturnDto> Items { get; set; } = [];
}

public class SaleItemForReturnDto
{
    public Guid SaleItemId { get; set; }
    public Guid? ProductBatchId { get; set; }
    public string? BatchCode { get; set; }
    public DateOnly? BatchReceivedDate { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public int QuantitySold { get; set; }
    public int ReturnedQuantity { get; set; }
    public int PendingReturnQuantity { get; set; }
    public int AvailableToReturn { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal SellingPriceAtSale { get; set; }
    public decimal CostPriceAtSale { get; set; }
}
