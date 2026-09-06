using GensanPOS.Application.Common;
using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;
using GensanPOS.Domain.Interfaces;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Repositories;

public class AuditLogRepository : Repository<AuditLog>, IAuditLogRepository
{
    public AuditLogRepository(AppDbContext context) : base(context) { }

    public async Task<IReadOnlyList<AuditLog>> GetRecentAsync(int count, CancellationToken cancellationToken = default) =>
        await DbSet.Where(a => !a.IsArchived)
            .OrderByDescending(a => a.CreatedAt)
            .Take(count)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

    public async Task<(IReadOnlyList<AuditLog> Items, int TotalCount)> SearchAsync(
        DateTime? from,
        DateTime? to,
        AuditLogCategory? category,
        string? action,
        string? entityType,
        string? search,
        int page,
        int pageSize,
        bool includeArchived,
        CancellationToken cancellationToken = default)
    {
        var query = ApplyFilters(DbSet.AsQueryable(), from, to, category, action, entityType, search, includeArchived);
        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .ToListAsync(cancellationToken);
        return (items, total);
    }

    public async Task<IReadOnlyList<AuditLog>> GetByEntityAsync(
        string entityType,
        string entityId,
        string? action,
        int maxRows,
        CancellationToken cancellationToken = default)
    {
        var query = DbSet.AsQueryable()
            .Where(a => a.EntityType == entityType && a.EntityId == entityId);
        if (!string.IsNullOrWhiteSpace(action))
            query = query.Where(a => a.Action == action);
        return await query
            .OrderByDescending(a => a.CreatedAt)
            .Take(maxRows)
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AuditLog>> SearchAllAsync(
        DateTime? from,
        DateTime? to,
        AuditLogCategory? category,
        string? action,
        string? entityType,
        string? search,
        int maxRows,
        CancellationToken cancellationToken = default) =>
        await ApplyFilters(DbSet.AsQueryable(), from, to, category, action, entityType, search, includeArchived: true)
            .OrderByDescending(a => a.CreatedAt)
            .Take(maxRows)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

    private static IQueryable<AuditLog> ApplyFilters(
        IQueryable<AuditLog> query,
        DateTime? from,
        DateTime? to,
        AuditLogCategory? category,
        string? action,
        string? entityType,
        string? search,
        bool includeArchived = false)
    {
        if (!includeArchived)
            query = query.Where(a => !a.IsArchived);

        if (from.HasValue)
        {
            var fromUtc = DateTime.SpecifyKind(from.Value.Date, DateTimeKind.Utc);
            query = query.Where(a => a.CreatedAt >= fromUtc);
        }
        if (to.HasValue)
        {
            var toUtc = DateTime.SpecifyKind(to.Value.Date.AddDays(1), DateTimeKind.Utc);
            query = query.Where(a => a.CreatedAt < toUtc);
        }

        if (category.HasValue)
        {
            if (category == AuditLogCategory.Security)
            {
                query = query.Where(a =>
                    a.Category == AuditLogCategory.Security ||
                    a.Action == "LOGIN" || a.Action == "LOGIN_SUCCESS" || a.Action == "LOGIN_FAILED" ||
                    a.Action == "LOGOUT" || a.Action == "PASSWORD_CHANGE" || a.Action == "ROLE_CHANGE" ||
                    a.Action == "ACCOUNT_LOCK" || a.Action == "ACCOUNT_UNLOCK");
            }
            else
            {
                query = query.Where(a =>
                    a.Category == AuditLogCategory.Operational &&
                    a.Action != "LOGIN" && a.Action != "LOGIN_SUCCESS" && a.Action != "LOGIN_FAILED" &&
                    a.Action != "LOGOUT" && a.Action != "PASSWORD_CHANGE" && a.Action != "ROLE_CHANGE" &&
                    a.Action != "ACCOUNT_LOCK" && a.Action != "ACCOUNT_UNLOCK");
            }
        }

        if (!string.IsNullOrWhiteSpace(action))
            query = query.Where(a => a.Action == action.Trim());
        if (!string.IsNullOrWhiteSpace(entityType))
            query = query.Where(a => a.EntityType == entityType.Trim());
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(a =>
                (a.Details != null && a.Details.Contains(term)) ||
                (a.UserEmail != null && a.UserEmail.Contains(term)) ||
                (a.EntityId != null && a.EntityId.Contains(term)) ||
                (a.IpAddress != null && a.IpAddress.Contains(term)) ||
                (a.UserAgent != null && a.UserAgent.Contains(term)) ||
                (a.OldValue != null && a.OldValue.Contains(term)) ||
                (a.NewValue != null && a.NewValue.Contains(term)));
        }

        return query;
    }
}
