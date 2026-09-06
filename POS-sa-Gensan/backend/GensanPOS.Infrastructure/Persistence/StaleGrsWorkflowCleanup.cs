using GensanPOS.Domain.Entities;
using GensanPOS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GensanPOS.Infrastructure.Persistence;

/// <summary>
/// One-time style cleanup for exchange-era slips left in draft, pending inspection, or approved-awaiting-exchange.
/// Idempotent: only touches slips still in those statuses.
/// </summary>
public static class StaleGrsWorkflowCleanup
{
    public const string ArchiveNote =
        "Auto-archived: legacy approval workflow removed; slip was not completed.";

    public static async Task ApplyAsync(AppDbContext context, ILogger? logger = null, CancellationToken cancellationToken = default)
    {
        var staleStatuses = new[]
        {
            GrsStatus.Draft,
            GrsStatus.PendingInspection,
            GrsStatus.Approved
        };

        var stale = await context.GoodsReturnSlips
            .Include(g => g.Items)
            .Where(g =>
                !g.IsArchived
                && staleStatuses.Contains(g.Status)
                && g.WorkflowKind == GrsWorkflowKind.ExchangeReturn
                && g.GoodsExchangeId == null)
            .ToListAsync(cancellationToken);

        if (stale.Count == 0)
        {
            await ReconcilePendingReturnQuantitiesAsync(context, cancellationToken);
            return;
        }

        logger?.LogInformation("Archiving {Count} stale GRS workflow slip(s)", stale.Count);
        var now = DateTime.UtcNow;

        foreach (var grs in stale)
        {
            var sale = await context.Sales
                .Include(s => s.Items)
                .FirstOrDefaultAsync(s => s.Id == grs.OriginalSaleId, cancellationToken);

            if (sale is null)
            {
                logger?.LogWarning("Stale GRS {GrsNumber} skipped: original sale missing", grs.GrsNumber);
                MarkCancelledWithoutSale(grs, now);
                continue;
            }

            try
            {
                if (grs.Status is GrsStatus.Draft or GrsStatus.PendingInspection)
                    await ArchivePendingAsync(context, grs, sale, now, cancellationToken);
                else
                    await ArchiveApprovedAsync(context, grs, sale, now, logger, cancellationToken);
            }
            catch (Exception ex)
            {
                logger?.LogError(ex, "Failed to archive stale GRS {GrsNumber}", grs.GrsNumber);
                throw;
            }
        }

        await context.SaveChangesAsync(cancellationToken);
        await ReconcilePendingReturnQuantitiesAsync(context, cancellationToken);
        logger?.LogInformation("Stale GRS workflow cleanup finished");
    }

    private static void MarkCancelledWithoutSale(GoodsReturnSlip grs, DateTime now)
    {
        grs.Status = GrsStatus.ExchangeCancelled;
        grs.RejectedAt = now;
        grs.RejectionReason = ArchiveNote;
        grs.IsArchived = true;
    }

    private static Task ArchivePendingAsync(
        AppDbContext context,
        GoodsReturnSlip grs,
        Sale sale,
        DateTime now,
        CancellationToken cancellationToken)
    {
        foreach (var item in grs.Items)
        {
            var saleItem = sale.Items.FirstOrDefault(i => i.Id == item.SaleItemId);
            if (saleItem is null) continue;
            saleItem.PendingReturnQuantity = Math.Max(0, saleItem.PendingReturnQuantity - item.Quantity);
        }

        grs.Status = GrsStatus.ExchangeCancelled;
        grs.RejectedAt = now;
        grs.RejectionReason = ArchiveNote;
        grs.IsArchived = true;
        context.Sales.Update(sale);
        context.GoodsReturnSlips.Update(grs);
        return Task.CompletedTask;
    }

    private static async Task ArchiveApprovedAsync(
        AppDbContext context,
        GoodsReturnSlip grs,
        Sale sale,
        DateTime now,
        ILogger? logger,
        CancellationToken cancellationToken)
    {
        var userId = grs.ApprovedByUserId ?? grs.ProcessedByUserId;

        if (grs.StockRestoredAt.HasValue)
        {
            foreach (var item in grs.Items)
            {
                var saleItem = sale.Items.FirstOrDefault(i => i.Id == item.SaleItemId);
                if (saleItem is null) continue;

                saleItem.ReturnedQuantity = Math.Max(0, saleItem.ReturnedQuantity - item.Quantity);

                var product = await context.Products.FindAsync([item.ProductId], cancellationToken);
                if (product is null) continue;

                var stockBefore = product.StockQuantity;
                product.StockQuantity = Math.Max(0, stockBefore - item.Quantity);
                var reversed = stockBefore - product.StockQuantity;

                if (reversed < item.Quantity)
                {
                    logger?.LogWarning(
                        "Stale GRS {GrsNumber}: stock for {Sku} low ({Stock}); reversed {Reversed} of {Requested}",
                        grs.GrsNumber,
                        item.ProductSku,
                        stockBefore,
                        reversed,
                        item.Quantity);
                }

                if (reversed > 0)
                {
                    context.InventoryTransactions.Add(new InventoryTransaction
                    {
                        ProductId = product.Id,
                        Type = InventoryTransactionType.Adjustment,
                        Quantity = -reversed,
                        StockBefore = stockBefore,
                        StockAfter = product.StockQuantity,
                        Reference = grs.GrsNumber,
                        Notes = $"Stale GRS archived — reversed approved return stock from invoice {sale.SaleNumber}",
                        UserId = userId
                    });
                }
            }

            grs.StockRestoredAt = null;
        }

        grs.Status = GrsStatus.Voided;
        grs.VoidedAt = now;
        grs.VoidedByUserId = userId;
        grs.VoidReason = ArchiveNote;
        grs.IsArchived = true;

        context.Sales.Update(sale);
        context.GoodsReturnSlips.Update(grs);
    }

    /// <summary>Aligns sale-line pending holds with any remaining pending-inspection slips (should be none after archive).</summary>
    private static async Task ReconcilePendingReturnQuantitiesAsync(
        AppDbContext context,
        CancellationToken cancellationToken)
    {
        var reserved = await context.GoodsReturnSlipItems
            .Where(i => i.GoodsReturnSlip.Status == GrsStatus.PendingInspection)
            .GroupBy(i => i.SaleItemId)
            .Select(g => new { SaleItemId = g.Key, Quantity = g.Sum(x => x.Quantity) })
            .ToListAsync(cancellationToken);

        var reservedBySaleItem = reserved.ToDictionary(x => x.SaleItemId, x => x.Quantity);

        var saleItemsWithPending = await context.SaleItems
            .Where(si => si.PendingReturnQuantity != 0)
            .ToListAsync(cancellationToken);

        foreach (var saleItem in saleItemsWithPending)
        {
            var expected = reservedBySaleItem.GetValueOrDefault(saleItem.Id, 0);
            if (saleItem.PendingReturnQuantity != expected)
                saleItem.PendingReturnQuantity = expected;
        }

        if (saleItemsWithPending.Count > 0 || reserved.Count > 0)
            await context.SaveChangesAsync(cancellationToken);
    }
}
