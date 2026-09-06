using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace GensanPOS.Infrastructure.Services;

/// <summary>
/// Periodically removes expense receipt image files from disk after retention
/// (default 365 days / 1 year) so uploaded receipts do not accumulate and consume server storage.
/// The attachment metadata row is kept — only the file on disk is deleted and the row is
/// flagged as purged so the UI can show that the file is no longer available.
/// </summary>
public class ExpenseAttachmentRetentionService : BackgroundService
{
    private static readonly TimeSpan RunInterval = TimeSpan.FromHours(24);
    private static readonly TimeSpan StartupDelay = TimeSpan.FromMinutes(2);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ExpenseAttachmentRetentionService> _logger;
    private readonly int _retentionDays;

    public ExpenseAttachmentRetentionService(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<ExpenseAttachmentRetentionService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _retentionDays = configuration.GetValue<int?>("Expenses:AttachmentRetentionDays") ?? 365;
        if (_retentionDays < 1) _retentionDays = 365;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(StartupDelay, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        using var timer = new PeriodicTimer(RunInterval);
        do
        {
            try
            {
                await PurgeExpiredFilesAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Expense attachment retention sweep failed.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task PurgeExpiredFilesAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var cutoff = DateTime.UtcNow.AddDays(-_retentionDays);

        var expired = await context.ExpenseVoucherAttachments
            .Where(a => a.FilePurgedAt == null && a.CreatedAt < cutoff)
            .ToListAsync(cancellationToken);

        if (expired.Count == 0) return;

        var uploadsRoot = Path.Combine(AppContext.BaseDirectory, "uploads", "expenses");
        var purgedAt = DateTime.UtcNow;
        var removed = 0;

        foreach (var attachment in expired)
        {
            var voucherFolder = Path.Combine(uploadsRoot, attachment.ExpenseVoucherId.ToString());
            var filePath = Path.Combine(voucherFolder, attachment.StoredFileName);

            try
            {
                if (File.Exists(filePath))
                    File.Delete(filePath);

                if (Directory.Exists(voucherFolder) &&
                    !Directory.EnumerateFileSystemEntries(voucherFolder).Any())
                {
                    Directory.Delete(voucherFolder);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Could not delete expired receipt file {File} for attachment {AttachmentId}.",
                    filePath,
                    attachment.Id);
            }

            attachment.FilePurgedAt = purgedAt;
            removed++;
        }

        await context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Expense attachment retention: removed {Count} receipt file(s) older than {Days} day(s).",
            removed,
            _retentionDays);
    }
}
