using GensanPOS.Domain.Common;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Domain.Entities;

public class ApprovalRequest : BaseEntity
{
    public ApprovalRequestType Type { get; set; }
    public ApprovalRequestStatus Status { get; set; } = ApprovalRequestStatus.Pending;
    public string Title { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string PayloadJson { get; set; } = string.Empty;
    public Guid RequestedByUserId { get; set; }
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public Guid? ApprovedByUserId { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public Guid? RejectedByUserId { get; set; }
    public DateTime? RejectedAt { get; set; }
    public string? ApprovalNotes { get; set; }
    public string? RejectionReason { get; set; }
    public bool ApprovedViaImmediateOverride { get; set; }
    public string? RequestedIpAddress { get; set; }
    public string? RequestedDeviceName { get; set; }
    public string? ApprovedIpAddress { get; set; }
    public string? ApprovedDeviceName { get; set; }
    public string? ResultEntityType { get; set; }
    public string? ResultEntityId { get; set; }

    public User RequestedByUser { get; set; } = null!;
    public User? ApprovedByUser { get; set; }
    public User? RejectedByUser { get; set; }
}
