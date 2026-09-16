using GensanPOS.Domain.Common;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Domain.Entities;

public class StockReceiving : BaseEntity
{
    public string ReceivingNumber { get; set; } = string.Empty;

    // Branch assignment
    public Guid? BranchId { get; set; }
    public Branch? Branch { get; set; }

    public Guid SupplierId { get; set; }
    public Supplier Supplier { get; set; } = null!;
    public string ContainerNumber { get; set; } = string.Empty;
    public string StockNumber { get; set; } = string.Empty;
    public string ReferenceNumber { get; set; } = string.Empty;
    public string? DeliveryReceiptNumber { get; set; }
    public DateTime DeliveryDate { get; set; }
    public StockReceivingStatus Status { get; set; } = StockReceivingStatus.Pending;
    public bool IsArchived { get; set; }
    public string? Notes { get; set; }

    public Guid RequestedByUserId { get; set; }
    public User RequestedByUser { get; set; } = null!;

    public Guid? ReviewedByUserId { get; set; }
    public User? ReviewedByUser { get; set; }

    public DateTime? ReviewedAt { get; set; }
    public string? RejectionReason { get; set; }
    public string? ApprovalNotes { get; set; }
    public Guid? PurchaseOrderId { get; set; }

    public ICollection<StockReceivingItem> Items { get; set; } = [];
    public ICollection<StockReceivingAttachment> Attachments { get; set; } = [];
}