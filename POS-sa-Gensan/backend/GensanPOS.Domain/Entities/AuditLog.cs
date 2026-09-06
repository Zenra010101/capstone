using GensanPOS.Domain.Common;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Domain.Entities;

public class AuditLog : BaseEntity
{
    public Guid? UserId { get; set; }
    public string? UserEmail { get; set; }
    public AuditLogCategory Category { get; set; } = AuditLogCategory.Operational;
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public string? Details { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string? Status { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public bool IsArchived { get; set; }
}
