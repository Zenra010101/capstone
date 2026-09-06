using GensanPOS.Domain.Enums;

namespace GensanPOS.Application.Interfaces;

public interface IAuditService
{
    Task LogAsync(
        Guid? userId,
        string? userEmail,
        string action,
        string entityType,
        string? entityId,
        string? details,
        string? ipAddress = null,
        CancellationToken cancellationToken = default);

    Task LogAsync(
        Guid? userId,
        string? userEmail,
        AuditLogCategory category,
        string action,
        string entityType,
        string? entityId,
        string? details,
        string? ipAddress = null,
        string? userAgent = null,
        string? status = null,
        string? oldValue = null,
        string? newValue = null,
        CancellationToken cancellationToken = default);
}
