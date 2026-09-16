using GensanPOS.Application.DTOs.Archive;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Enums;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Services;

public class ArchiveService : IArchiveService
{
    private readonly AppDbContext _context;
    private readonly IAuditService _auditService;

    public ArchiveService(AppDbContext context, IAuditService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

    public Task<ArchiveResultDto> PreviewArchiveBeforeAsync(
        ArchiveRequest request,
        CancellationToken cancellationToken = default) =>
        CountCandidatesAsync(request, cancellationToken);

    public async Task<ArchiveResultDto> ArchiveBeforeAsync(
        ArchiveRequest request,
        Guid userId,
        string? userEmail,
        CancellationToken cancellationToken = default)
    {
        var cutoff = ArchiveCutoffUtc(request.BeforeDate);
        var result = new ArchiveResultDto();

        if (request.IncludeSales)
        {
            var sales = await _context.Sales
                .Where(s => !s.IsArchived && s.CreatedAt < cutoff)
                .ToListAsync(cancellationToken);
            foreach (var s in sales)
                s.IsArchived = true;
            result.SalesArchived = sales.Count;
        }

        if (request.IncludeReturns)
        {
            var grs = await _context.GoodsReturnSlips
                .Where(g => !g.IsArchived && g.ReturnDate < cutoff)
                .ToListAsync(cancellationToken);
            foreach (var g in grs)
                g.IsArchived = true;
            result.ReturnsArchived = grs.Count;
        }

        if (request.IncludeReceivings)
        {
            var recv = await _context.StockReceivings
                .Where(r => !r.IsArchived && r.DeliveryDate < cutoff)
                .ToListAsync(cancellationToken);
            foreach (var r in recv)
                r.IsArchived = true;
            result.ReceivingsArchived = recv.Count;
        }

        if (request.IncludeReceivables)
        {
            var recv = await _context.CustomerReceivables
                .Where(r => !r.IsArchived && r.CreatedAt < cutoff)
                .ToListAsync(cancellationToken);
            foreach (var r in recv)
                r.IsArchived = true;
            result.ReceivablesArchived = recv.Count;
        }

        if (request.IncludeAuditLogs)
        {
            var logs = await _context.AuditLogs
                .Where(a => !a.IsArchived && a.CreatedAt < cutoff)
                .ToListAsync(cancellationToken);
            foreach (var a in logs)
                a.IsArchived = true;
            result.AuditLogsArchived = logs.Count;
        }

        await _context.SaveChangesAsync(cancellationToken);

        var total = result.SalesArchived + result.ReturnsArchived + result.ReceivingsArchived
            + result.ReceivablesArchived + result.AuditLogsArchived;
        if (total > 0)
        {
            await _auditService.LogAsync(
                userId,
                userEmail,
                AuditLogCategory.Operational,
                "DataArchive",
                "System",
                null,
                $"Soft-archived {total} record(s) before {cutoff:yyyy-MM-dd} UTC. " +
                $"Sales={result.SalesArchived}, GRS={result.ReturnsArchived}, " +
                $"Receiving={result.ReceivingsArchived}, Receivables={result.ReceivablesArchived}, " +
                $"AuditLogs={result.AuditLogsArchived}",
                cancellationToken: cancellationToken);
        }

        return result;
    }

    private async Task<ArchiveResultDto> CountCandidatesAsync(
        ArchiveRequest request,
        CancellationToken cancellationToken)
    {
        var cutoff = ArchiveCutoffUtc(request.BeforeDate);
        var result = new ArchiveResultDto();

        if (request.IncludeSales)
        {
            result.SalesArchived = await _context.Sales
                .CountAsync(s => !s.IsArchived && s.CreatedAt < cutoff, cancellationToken);
        }

        if (request.IncludeReturns)
        {
            result.ReturnsArchived = await _context.GoodsReturnSlips
                .CountAsync(g => !g.IsArchived && g.ReturnDate < cutoff, cancellationToken);
        }

        if (request.IncludeReceivings)
        {
            result.ReceivingsArchived = await _context.StockReceivings
                .CountAsync(r => !r.IsArchived && r.DeliveryDate < cutoff, cancellationToken);
        }

        if (request.IncludeReceivables)
        {
            result.ReceivablesArchived = await _context.CustomerReceivables
                .CountAsync(r => !r.IsArchived && r.CreatedAt < cutoff, cancellationToken);
        }

        if (request.IncludeAuditLogs)
        {
            result.AuditLogsArchived = await _context.AuditLogs
                .CountAsync(a => !a.IsArchived && a.CreatedAt < cutoff, cancellationToken);
        }

        return result;
    }

    private static DateTime ArchiveCutoffUtc(DateTime beforeDate) =>
        DateTime.SpecifyKind(beforeDate.Date, DateTimeKind.Utc);
}
