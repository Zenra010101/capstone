using GensanPOS.Domain.Common;

namespace GensanPOS.Domain.Entities;

/// <summary>
/// Explicit sales deduction tied to a GRS — amount reduces reports on <see cref="DeductionDate"/> (return date), not original sale date.
/// </summary>
public class SalesReturnDeduction : BaseEntity
{
    public Guid GoodsReturnSlipId { get; set; }
    public GoodsReturnSlip GoodsReturnSlip { get; set; } = null!;
    public Guid OriginalSaleId { get; set; }
    public string OriginalInvoiceNumber { get; set; } = string.Empty;
    public DateTime DeductionDate { get; set; }
    public DateTime OriginalSaleDate { get; set; }
    public decimal Amount { get; set; }
    public Guid ProcessedByUserId { get; set; }
    public User ProcessedByUser { get; set; } = null!;
    public bool IsReversed { get; set; }
}
