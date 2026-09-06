using GensanPOS.Domain.Entities;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Services;

/// <summary>
/// Creates one <see cref="ProductBatch"/> per approved stock receiving line.
/// Batch identity represents a receiving event (line), never price-based consolidation.
/// </summary>
internal static class ReceivingBatchCreator
{
    public static string BatchCodePrefix(DateOnly receivedDate) => $"B{receivedDate:yyyyMMdd}-";

    public static async Task<int> CountExistingCodesForDateAsync(
        AppDbContext context,
        DateOnly receivedDate,
        CancellationToken cancellationToken = default)
    {
        var prefix = BatchCodePrefix(receivedDate);
        return await context.ProductBatches
            .CountAsync(b => b.BatchCode != null && b.BatchCode.StartsWith(prefix), cancellationToken);
    }

    public static string NextBatchCode(DateOnly receivedDate, ref int sequence)
    {
        sequence++;
        return $"{BatchCodePrefix(receivedDate)}{sequence:D3}";
    }

    public static ProductBatch CreateForLine(
        StockReceivingItem line,
        Product product,
        StockReceiving receiving,
        string batchCode,
        DateOnly receivedDate,
        Guid approvedByUserId) =>
        new()
        {
            ProductId = product.Id,
            BatchCode = batchCode,
            CostPrice = line.CostPrice,
            SellingPrice = line.SellingPrice,
            ReceivedQuantity = line.Quantity,
            Quantity = line.Quantity,
            ReceivedDate = receivedDate,
            StockReceivingId = receiving.Id,
            StockReceivingItemId = line.Id,
            SupplierId = receiving.SupplierId,
            ReceivedByUserId = receiving.RequestedByUserId,
            ApprovedByUserId = approvedByUserId,
            IsActive = true
        };
}
