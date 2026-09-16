using GensanPOS.Domain.Common;

namespace GensanPOS.Domain.Entities;

/// <summary>Per-batch physical count line within an inventory adjustment request.</summary>
public class InventoryAdjustmentRequestLine : BaseEntity
{
    public Guid InventoryAdjustmentRequestId { get; set; }
    public InventoryAdjustmentRequest Request { get; set; } = null!;
    public Guid ProductBatchId { get; set; }
    public ProductBatch ProductBatch { get; set; } = null!;
    public int SystemQuantity { get; set; }
    public int ActualQuantity { get; set; }
    public int Difference { get; set; }
}
