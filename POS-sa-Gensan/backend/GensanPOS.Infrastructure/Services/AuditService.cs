using GensanPOS.Application.Common;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;
using GensanPOS.Domain.Interfaces;
namespace GensanPOS.Infrastructure.Services;

public class AuditService : IAuditService
{
    private readonly IRepository<AuditLog> _auditRepository;
    private readonly IUnitOfWork _unitOfWork;

    public AuditService(IRepository<AuditLog> auditRepository, IUnitOfWork unitOfWork)
    {
        _auditRepository = auditRepository;
        _unitOfWork = unitOfWork;
    }

    public Task LogAsync(
        Guid? userId,
        string? userEmail,
        string action,
        string entityType,
        string? entityId,
        string? details,
        string? ipAddress = null,
        CancellationToken cancellationToken = default) =>
        LogAsync(
            userId,
            userEmail,
            AuditLogClassifier.Classify(action, entityType),
            action,
            entityType,
            entityId,
            details,
            ipAddress,
            null,
            null,
            null,
            null,
            cancellationToken);

    public async Task LogAsync(
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
        CancellationToken cancellationToken = default)
    {
        var combinedDetails = details;
        if (!string.IsNullOrWhiteSpace(oldValue) || !string.IsNullOrWhiteSpace(newValue))
        {
            var change = $"Old: {oldValue ?? "—"} → New: {newValue ?? "—"}";
            combinedDetails = string.IsNullOrWhiteSpace(details) ? change : $"{details} | {change}";
        }

        var log = new AuditLog
        {
            UserId = userId,
            UserEmail = userEmail,
            Category = category,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Details = combinedDetails,
            IpAddress = ipAddress,
            UserAgent = Truncate(userAgent, 500),
            Status = status,
            OldValue = oldValue,
            NewValue = newValue
        };

        await _auditRepository.AddAsync(log, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static string? Truncate(string? value, int max) =>
        string.IsNullOrEmpty(value) ? value : value.Length <= max ? value : value[..max];
}
