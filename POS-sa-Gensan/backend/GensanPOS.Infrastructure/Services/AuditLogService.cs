using ClosedXML.Excel;
using GensanPOS.Application.Common;
using GensanPOS.Application.DTOs.Audit;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Enums;
using GensanPOS.Domain.Interfaces;
using GensanPOS.Infrastructure.Services.Reports;

namespace GensanPOS.Infrastructure.Services;

public class AuditLogService : IAuditLogService
{
    private const int ExportMaxRows = 5000;
    private readonly IAuditLogRepository _auditLogRepository;

    public AuditLogService(IAuditLogRepository auditLogRepository) =>
        _auditLogRepository = auditLogRepository;

    public async Task<IReadOnlyList<AuditLogDto>> GetRecentAsync(int count = 50, CancellationToken cancellationToken = default)
    {
        var logs = await _auditLogRepository.GetRecentAsync(count, cancellationToken);
        return logs.Select(Map).ToList();
    }

    public async Task<AuditLogSearchResult> SearchAsync(
        DateTime? from,
        DateTime? to,
        AuditLogCategory? category,
        string? action,
        string? entityType,
        string? search,
        int page = 1,
        int pageSize = 50,
        bool includeArchived = false,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 10, 200);
        var (items, total) = await _auditLogRepository.SearchAsync(
            from, to, category, action, entityType, search, page, pageSize, includeArchived, cancellationToken);

        return new AuditLogSearchResult
        {
            Items = items.Select(Map).ToList(),
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<byte[]> ExportExcelAsync(
        DateTime? from,
        DateTime? to,
        AuditLogCategory? category,
        string? action,
        string? entityType,
        string? search,
        CancellationToken cancellationToken = default)
    {
        var logs = await _auditLogRepository.SearchAllAsync(
            from, to, category, action, entityType, search, ExportMaxRows, cancellationToken);

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Audit log");
        ws.Cell(1, 1).Value = "GensanPOS Audit Log";
        var headers = new[]
        {
            "When (UTC)", "User", "Log type", "Action", "Status", "Entity", "Entity ID",
            "Old value", "New value", "Details", "IP", "Device/Browser"
        };
        for (var c = 0; c < headers.Length; c++)
            ws.Cell(3, c + 1).Value = headers[c];

        var row = 4;
        foreach (var log in logs)
        {
            var dto = Map(log);
            ws.Cell(row, 1).Value = log.CreatedAt;
            ws.Cell(row, 2).Value = log.UserEmail ?? "";
            ws.Cell(row, 3).Value = dto.LogType;
            ws.Cell(row, 4).Value = log.Action;
            ws.Cell(row, 5).Value = log.Status ?? "";
            ws.Cell(row, 6).Value = log.EntityType;
            ws.Cell(row, 7).Value = log.EntityId ?? "";
            ws.Cell(row, 8).Value = log.OldValue ?? "";
            ws.Cell(row, 9).Value = log.NewValue ?? "";
            ws.Cell(row, 10).Value = log.Details ?? "";
            ws.Cell(row, 11).Value = log.IpAddress ?? "";
            ws.Cell(row, 12).Value = log.UserAgent ?? "";
            row++;
        }

        ws.Columns().AdjustToContents();
        using var stream = new MemoryStream();
        wb.SaveAs(stream);
        return stream.ToArray();
    }

    public async Task<byte[]> ExportPdfAsync(
        DateTime? from,
        DateTime? to,
        AuditLogCategory? category,
        string? action,
        string? entityType,
        string? search,
        CancellationToken cancellationToken = default)
    {
        var logs = await _auditLogRepository.SearchAllAsync(
            from, to, category, action, entityType, search, ExportMaxRows, cancellationToken);

        var rows = logs.Select(l =>
        {
            var dto = Map(l);
            return (
                l.CreatedAt.ToString("yyyy-MM-dd HH:mm"),
                l.UserEmail ?? "—",
                dto.LogType,
                l.Action,
                (l.Details ?? "").Length > 80 ? (l.Details ?? "")[..80] + "…" : l.Details ?? ""
            );
        }).ToList();

        return ReportDocumentHelper.BuildAuditPdf("GensanPOS Audit Log", rows);
    }

    private static AuditLogDto Map(Domain.Entities.AuditLog l)
    {
        var category = AuditLogClassifier.Classify(l.Action, l.EntityType) == AuditLogCategory.Security
            ? AuditLogCategory.Security
            : l.Category;

        return new AuditLogDto
        {
            Id = l.Id,
            UserEmail = l.UserEmail,
            Category = category,
            LogType = AuditLogClassifier.CategoryLabel(category),
            Action = l.Action,
            EntityType = l.EntityType,
            EntityId = l.EntityId,
            Details = l.Details,
            IpAddress = l.IpAddress,
            UserAgent = l.UserAgent,
            Status = l.Status,
            OldValue = l.OldValue,
            NewValue = l.NewValue,
            CreatedAt = l.CreatedAt,
            IsArchived = l.IsArchived
        };
    }
}
