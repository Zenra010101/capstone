using GensanPOS.Domain.Enums;

namespace GensanPOS.Application.DTOs.Audit;

public class AuditLogDto
{
    public Guid Id { get; set; }
    public string? UserEmail { get; set; }
    public AuditLogCategory Category { get; set; }
    public string LogType { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public string? Details { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string? Status { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsArchived { get; set; }
}
