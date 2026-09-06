using GensanPOS.Domain.Common;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Domain.Entities;

public class InventoryAdjustmentRequest : BaseEntity
{
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public int SystemQuantity { get; set; }
    public int ActualQuantity { get; set; }
    public int Difference { get; set; }
    public AdjustmentType AdjustmentType { get; set; } = AdjustmentType.ManualCorrection;
    public string Reason { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public AdjustmentRequestStatus Status { get; set; } = AdjustmentRequestStatus.Pending;
    public Guid RequestedByUserId { get; set; }
    public User RequestedByUser { get; set; } = null!;
    public Guid? ReviewedByUserId { get; set; }
    public User? ReviewedByUser { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ApprovalNotes { get; set; }
    public string? RejectionReason { get; set; }
    /// <summary>Optional link to a physical count session.</summary>
    public Guid? CountingSessionId { get; set; }
    public ICollection<InventoryAdjustmentRequestLine> Lines { get; set; } = [];
}
