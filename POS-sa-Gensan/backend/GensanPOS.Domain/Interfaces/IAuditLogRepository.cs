using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;

namespace GensanPOS.Domain.Interfaces;

public interface IAuditLogRepository : IRepository<AuditLog>
{
    Task<IReadOnlyList<AuditLog>> GetRecentAsync(int count, CancellationToken cancellationToken = default);

    Task<(IReadOnlyList<AuditLog> Items, int TotalCount)> SearchAsync(
        DateTime? from,
        DateTime? to,
        AuditLogCategory? category,
        string? action,
        string? entityType,
        string? search,
        int page,
        int pageSize,
        bool includeArchived,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AuditLog>> SearchAllAsync(
        DateTime? from,
        DateTime? to,
        AuditLogCategory? category,
        string? action,
        string? entityType,
        string? search,
        int maxRows,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AuditLog>> GetByEntityAsync(
        string entityType,
        string entityId,
        string? action,
        int maxRows,
        CancellationToken cancellationToken = default);
}
