using GensanPOS.Application.Common;
using GensanPOS.Domain.Enums;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Services.Reports;

internal static class NetProfitQueryHelper
{
    public static async Task<NetProfitMetrics> ComputeAsync(
        AppDbContext context,
        DateTime periodFrom,
        DateTime toExclusive,
        bool includeArchived,
        Guid? saleUserId,
        Guid? returnsProcessedByUserId,
        CancellationToken cancellationToken = default)
    {
        var salesQuery = context.Sales.AsNoTracking()
            .Where(s => s.Status == SaleStatus.Completed
                && s.CreatedAt >= periodFrom
                && s.CreatedAt < toExclusive);
        if (!includeArchived)
            salesQuery = salesQuery.Where(s => !s.IsArchived);
        if (saleUserId.HasValue)
            salesQuery = salesQuery.Where(s => s.UserId == saleUserId.Value);

        var salesProfit = await salesQuery.SumAsync(s => (decimal?)s.GrossProfit, cancellationToken) ?? 0;

        var zeroCostLines = await (
            from s in salesQuery
            join i in context.SaleItems.AsNoTracking() on s.Id equals i.SaleId
            where i.CostPriceAtSale == 0 && i.LineTotal > 0
            select i.Id
        ).CountAsync(cancellationToken);

        var returnsBase = context.GoodsReturnSlips.AsNoTracking()
            .Where(g => g.Status == GrsStatus.Completed
                && g.ReturnDate >= periodFrom
                && g.ReturnDate < toExclusive);
        if (!includeArchived)
            returnsBase = returnsBase.Where(g => !g.IsArchived);
        if (returnsProcessedByUserId.HasValue)
            returnsBase = returnsBase.Where(g => g.ProcessedByUserId == returnsProcessedByUserId.Value);

        var returnsProfit = await (
            from g in returnsBase
            join i in context.GoodsReturnSlipItems.AsNoTracking() on g.Id equals i.GoodsReturnSlipId
            select i.LineTotal - i.CostPriceAtSale * i.Quantity
        ).SumAsync(cancellationToken);

        var evenExchangeBase = context.GoodsExchanges.AsNoTracking()
            .Where(e => e.CompletedAt >= periodFrom
                && e.CompletedAt < toExclusive
                && e.TopUpSaleId == null);

        var evenExchangeProfit = await (
            from e in evenExchangeBase
            join g in context.GoodsReturnSlips.AsNoTracking() on e.GoodsReturnSlipId equals g.Id
            where !returnsProcessedByUserId.HasValue || g.ProcessedByUserId == returnsProcessedByUserId.Value
            join l in context.GoodsExchangeLines.AsNoTracking() on e.Id equals l.GoodsExchangeId
            select l.ProfitAmount
        ).SumAsync(cancellationToken);

        return new NetProfitMetrics
        {
            SalesProfit = salesProfit,
            ReturnsProfitReversed = returnsProfit,
            EvenExchangeReplacementProfit = evenExchangeProfit,
            ZeroCostSaleLineCount = zeroCostLines
        };
    }

    public static async Task<Dictionary<DateTime, NetProfitMetrics>> ComputeDailyAsync(
        AppDbContext context,
        DateTime periodFrom,
        DateTime toExclusive,
        bool includeArchived,
        Guid? saleUserId,
        Guid? returnsProcessedByUserId,
        CancellationToken cancellationToken = default)
    {
        var salesByDay = await context.Sales.AsNoTracking()
            .Where(s => s.Status == SaleStatus.Completed
                && s.CreatedAt >= periodFrom
                && s.CreatedAt < toExclusive
                && (includeArchived || !s.IsArchived))
            .Where(s => !saleUserId.HasValue || s.UserId == saleUserId.Value)
            .GroupBy(s => s.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Profit = g.Sum(s => s.GrossProfit) })
            .ToListAsync(cancellationToken);

        var returnsBase = context.GoodsReturnSlips.AsNoTracking()
            .Where(g => g.Status == GrsStatus.Completed
                && g.ReturnDate >= periodFrom
                && g.ReturnDate < toExclusive
                && (includeArchived || !g.IsArchived))
            .Where(g => !returnsProcessedByUserId.HasValue || g.ProcessedByUserId == returnsProcessedByUserId.Value);

        var returnsByDay = await (
            from g in returnsBase
            join i in context.GoodsReturnSlipItems.AsNoTracking() on g.Id equals i.GoodsReturnSlipId
            group i by g.ReturnDate.Date
            into dayGroup
            select new
            {
                Date = dayGroup.Key,
                Profit = dayGroup.Sum(i => i.LineTotal - i.CostPriceAtSale * i.Quantity)
            }
        ).ToListAsync(cancellationToken);

        var evenByDay = await (
            from e in context.GoodsExchanges.AsNoTracking()
            join g in context.GoodsReturnSlips.AsNoTracking() on e.GoodsReturnSlipId equals g.Id
            where e.CompletedAt >= periodFrom
                && e.CompletedAt < toExclusive
                && e.TopUpSaleId == null
                && (!returnsProcessedByUserId.HasValue || g.ProcessedByUserId == returnsProcessedByUserId.Value)
            join l in context.GoodsExchangeLines.AsNoTracking() on e.Id equals l.GoodsExchangeId
            group l by e.CompletedAt.Date
            into dayGroup
            select new { Date = dayGroup.Key, Profit = dayGroup.Sum(l => l.ProfitAmount) }
        ).ToListAsync(cancellationToken);

        var dates = salesByDay.Select(x => x.Date)
            .Union(returnsByDay.Select(x => x.Date))
            .Union(evenByDay.Select(x => x.Date))
            .Distinct();

        var result = new Dictionary<DateTime, NetProfitMetrics>();
        foreach (var date in dates)
        {
            result[date] = new NetProfitMetrics
            {
                SalesProfit = salesByDay.FirstOrDefault(x => x.Date == date)?.Profit ?? 0,
                ReturnsProfitReversed = returnsByDay.FirstOrDefault(x => x.Date == date)?.Profit ?? 0,
                EvenExchangeReplacementProfit = evenByDay.FirstOrDefault(x => x.Date == date)?.Profit ?? 0
            };
        }

        return result;
    }
}
