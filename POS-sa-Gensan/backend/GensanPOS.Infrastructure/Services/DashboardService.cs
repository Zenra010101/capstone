using GensanPOS.Application.DTOs.Dashboard;
using GensanPOS.Application.Interfaces;
using GensanPOS.Domain.Constants;
using GensanPOS.Domain.Enums;
using GensanPOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GensanPOS.Infrastructure.Services;

public class DashboardService : IDashboardService
{
    private readonly AppDbContext _context;
    private readonly IProfitAnalyticsService _profitAnalytics;

    public DashboardService(AppDbContext context, IProfitAnalyticsService profitAnalytics)
    {
        _context = context;
        _profitAnalytics = profitAnalytics;
    }

    public async Task<DashboardDto> GetSummaryAsync(Guid userId, string role, CancellationToken cancellationToken = default)
    {
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);
        var monthStart = new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var isOwner = RoleNames.IsOwner(role);
        var chartFrom = today.AddDays(-6);

        var todayBase = _context.Sales.AsNoTracking()
            .Where(s => s.Status == SaleStatus.Completed && !s.IsArchived
                && s.CreatedAt >= today && s.CreatedAt < tomorrow);

        var storeTodaySales = await todayBase.SumAsync(s => (decimal?)s.TotalAmount, cancellationToken) ?? 0;
        var storeTodayCount = await todayBase.CountAsync(cancellationToken);
        var storeTodayCollectedAtSale = await todayBase
            .Where(s => s.PaymentMethod != PaymentMethod.Charged && s.PaymentMethod != PaymentMethod.Cheque)
            .SumAsync(s => (decimal?)(s.PaymentMethod == PaymentMethod.Cash ? s.TotalAmount : s.AmountPaid), cancellationToken) ?? 0;
        var storeTodayReceivableCollected = await ReceivablePaymentsCollectedAsync(null, today, tomorrow, cancellationToken);
        var storeTodayCollected = storeTodayCollectedAtSale + storeTodayReceivableCollected;

        var myTodaySales = await todayBase.Where(s => s.UserId == userId)
            .SumAsync(s => (decimal?)s.TotalAmount, cancellationToken) ?? 0;
        var myTodayCount = await todayBase.CountAsync(s => s.UserId == userId, cancellationToken);
        var myTodayCollectedAtSale = await todayBase
            .Where(s => s.UserId == userId && s.PaymentMethod != PaymentMethod.Charged && s.PaymentMethod != PaymentMethod.Cheque)
            .SumAsync(s => (decimal?)(s.PaymentMethod == PaymentMethod.Cash ? s.TotalAmount : s.AmountPaid), cancellationToken) ?? 0;
        var myTodayReceivableCollected = await ReceivablePaymentsCollectedAsync(userId, today, tomorrow, cancellationToken);
        var myTodayCollected = myTodayCollectedAtSale + myTodayReceivableCollected;

        var cashiersTodaySales = isOwner
            ? await todayBase.Where(s => s.UserId != userId).SumAsync(s => (decimal?)s.TotalAmount, cancellationToken) ?? 0
            : 0;
        var cashiersTodayCount = isOwner
            ? await todayBase.Where(s => s.UserId != userId).CountAsync(cancellationToken)
            : 0;
        var cashiersTodayCollected = isOwner
            ? storeTodayCollected - myTodayCollected
            : 0;

        var todayReturnsQuery = _context.GoodsReturnSlips.AsNoTracking()
            .Where(g => g.Status == GrsStatus.Completed && !g.IsArchived
                && g.ReturnDate >= today && g.ReturnDate < tomorrow);
        if (!isOwner)
            todayReturnsQuery = todayReturnsQuery.Where(g => g.ProcessedByUserId == userId);

        var todayReturns = await todayReturnsQuery.SumAsync(g => (decimal?)g.TotalReturnAmount, cancellationToken) ?? 0;

        decimal ownerRoleTodaySales = 0;
        decimal cashierRoleTodaySales = 0;
        decimal ownerRoleTodayReturns = 0;
        decimal cashierRoleTodayReturns = 0;
        var ownerRoleTodayCount = 0;
        var cashierRoleTodayCount = 0;

        if (isOwner)
        {
            var salesByRole = await todayBase
                .GroupBy(s => s.User.Role.Name)
                .Select(g => new { Role = g.Key, Total = g.Sum(s => s.TotalAmount), Count = g.Count() })
                .ToListAsync(cancellationToken);

            ownerRoleTodaySales = salesByRole.FirstOrDefault(x => x.Role == RoleNames.Owner)?.Total ?? 0;
            cashierRoleTodaySales = salesByRole.FirstOrDefault(x => x.Role == RoleNames.Cashier)?.Total ?? 0;
            ownerRoleTodayCount = salesByRole.FirstOrDefault(x => x.Role == RoleNames.Owner)?.Count ?? 0;
            cashierRoleTodayCount = salesByRole.FirstOrDefault(x => x.Role == RoleNames.Cashier)?.Count ?? 0;

            var returnsByRole = await _context.GoodsReturnSlips.AsNoTracking()
                .Where(g => g.Status == GrsStatus.Completed && !g.IsArchived
                    && g.ReturnDate >= today && g.ReturnDate < tomorrow)
                .GroupBy(g => g.OriginalSale.User.Role.Name)
                .Select(g => new { Role = g.Key, Total = g.Sum(x => x.TotalReturnAmount) })
                .ToListAsync(cancellationToken);

            ownerRoleTodayReturns = returnsByRole.FirstOrDefault(x => x.Role == RoleNames.Owner)?.Total ?? 0;
            cashierRoleTodayReturns = returnsByRole.FirstOrDefault(x => x.Role == RoleNames.Cashier)?.Total ?? 0;
        }

        var salesLast7Query = _context.Sales.AsNoTracking()
            .Where(s => s.Status == SaleStatus.Completed && !s.IsArchived && s.CreatedAt >= chartFrom);
        if (!isOwner)
            salesLast7Query = salesLast7Query.Where(s => s.UserId == userId);

        var salesByDay = await salesLast7Query
            .GroupBy(s => s.CreatedAt.Date)
            .Select(g => new
            {
                Date = g.Key,
                Total = g.Sum(s => s.TotalAmount),
                Collected = g.Sum(s =>
                    s.PaymentMethod == PaymentMethod.Cash
                        ? s.TotalAmount
                        : s.PaymentMethod == PaymentMethod.Cheque || s.PaymentMethod == PaymentMethod.Charged
                            ? 0
                            : s.AmountPaid),
                Count = g.Count()
            })
            .ToListAsync(cancellationToken);

        var receivablePaymentsLast7Query = _context.ReceivablePayments.AsNoTracking()
            .Include(p => p.CustomerReceivable)
            .ThenInclude(r => r.Sale)
            .Where(p => !p.IsCredit && !p.IsChequePending && !p.IsVoided
                && p.PaymentDate >= chartFrom && p.PaymentDate < tomorrow);
        if (!isOwner)
            receivablePaymentsLast7Query = receivablePaymentsLast7Query.Where(p => p.CustomerReceivable.Sale!.UserId == userId);

        var receivablePaymentsByDay = await receivablePaymentsLast7Query
            .GroupBy(p => p.PaymentDate.Date)
            .Select(g => new { Date = g.Key, Total = g.Sum(p => p.Amount) })
            .ToListAsync(cancellationToken);

        var returnsLast7Query = _context.GoodsReturnSlips.AsNoTracking()
            .Where(g => g.Status == GrsStatus.Completed && !g.IsArchived && g.ReturnDate >= chartFrom);
        if (!isOwner)
            returnsLast7Query = returnsLast7Query.Where(g => g.ProcessedByUserId == userId);

        var returnsByDay = await returnsLast7Query
            .GroupBy(g => g.ReturnDate.Date)
            .Select(g => new { Date = g.Key, Total = g.Sum(x => x.TotalReturnAmount) })
            .ToListAsync(cancellationToken);

        var last7Days = Enumerable.Range(0, 7)
            .Select(i => today.AddDays(-i))
            .Reverse()
            .Select(d =>
            {
                var gross = salesByDay.FirstOrDefault(x => x.Date == d)?.Total ?? 0;
                var collectedAtSale = salesByDay.FirstOrDefault(x => x.Date == d)?.Collected ?? 0;
                var receivableCollected = receivablePaymentsByDay.FirstOrDefault(x => x.Date == d)?.Total ?? 0;
                var returns = returnsByDay.FirstOrDefault(x => x.Date == d)?.Total ?? 0;
                return new DailySalesSummary
                {
                    Date = d.ToString("MMM dd"),
                    Total = gross,
                    Returns = returns,
                    NetTotal = gross - returns,
                    Collected = collectedAtSale + receivableCollected,
                    Count = salesByDay.FirstOrDefault(x => x.Date == d)?.Count ?? 0
                };
            })
            .ToList();

        var topQuery = _context.SaleItems.AsNoTracking()
            .Where(si => si.Sale.Status == SaleStatus.Completed && !si.Sale.IsArchived
                && si.Sale.CreatedAt >= monthStart);
        if (!isOwner)
            topQuery = topQuery.Where(si => si.Sale.UserId == userId);

        var topProducts = await topQuery
            .GroupBy(si => new { si.ProductId, si.ProductName })
            .Select(g => new TopProductSummary
            {
                ProductId = g.Key.ProductId,
                ProductName = g.Key.ProductName,
                ProductSku = g.Max(x => x.ProductSku),
                QuantitySold = g.Sum(x => x.Quantity),
                Revenue = g.Sum(x => x.LineTotal)
            })
            .OrderByDescending(x => x.QuantitySold)
            .Take(5)
            .ToListAsync(cancellationToken);

        var productStats = await _context.Products.AsNoTracking()
            .Where(p => p.IsActive)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Total = g.Count(),
                LowStock = g.Count(p => p.StockQuantity < InventoryConstants.LowStockThreshold)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var grossToday = isOwner ? storeTodaySales : myTodaySales;

        var dto = new DashboardDto
        {
            IsOwnerView = isOwner,
            TodaySales = grossToday,
            TodayReturns = todayReturns,
            TodayNetSales = grossToday - todayReturns,
            TodayCollected = isOwner ? storeTodayCollected : myTodayCollected,
            TodayTransactions = isOwner ? storeTodayCount : myTodayCount,
            MyTodaySales = myTodaySales,
            MyTodayCollected = myTodayCollected,
            MyTodayTransactions = myTodayCount,
            CashiersTodaySales = cashiersTodaySales,
            CashiersTodayCollected = cashiersTodayCollected,
            CashiersTodayTransactions = cashiersTodayCount,
            OwnerRoleTodaySales = ownerRoleTodaySales,
            OwnerRoleTodayReturns = ownerRoleTodayReturns,
            OwnerRoleTodayNetSales = ownerRoleTodaySales - ownerRoleTodayReturns,
            OwnerRoleTodayTransactions = ownerRoleTodayCount,
            CashierRoleTodaySales = cashierRoleTodaySales,
            CashierRoleTodayReturns = cashierRoleTodayReturns,
            CashierRoleTodayNetSales = cashierRoleTodaySales - cashierRoleTodayReturns,
            CashierRoleTodayTransactions = cashierRoleTodayCount,
            StoreTodaySales = storeTodaySales,
            StoreTodayCollected = storeTodayCollected,
            TotalProducts = productStats?.Total ?? 0,
            LowStockCount = productStats?.LowStock ?? 0,
            Last7Days = last7Days,
            TopProducts = topProducts
        };

        if (isOwner)
        {
            var profit = await _profitAnalytics.GetOwnerDashboardMetricsAsync(cancellationToken);
            dto.TodayProfit = profit.TodayProfit;
            dto.TodaySalesProfit = profit.TodaySalesProfit;
            dto.TodayReturnsProfitReversed = profit.TodayReturnsProfitReversed;
            dto.TodayZeroCostSaleLineCount = profit.TodayZeroCostSaleLineCount;
            dto.ProfitMissingCostWarning = profit.ProfitMissingCostWarning;
            dto.MonthSales = profit.MonthSales;
            dto.MonthProfit = profit.MonthProfit;
            dto.TotalRevenue = profit.TotalRevenue;
            dto.TotalProfit = profit.TotalProfit;
            dto.InventoryValue = profit.InventoryValue;
            dto.ProfitLast7Days = profit.ProfitLast7Days.Select(p => new DailyProfitPointDto
            {
                Date = p.Date,
                Sales = p.Sales,
                Profit = p.Profit
            }).ToList();
        }

        return dto;
    }

    private async Task<decimal> ReceivablePaymentsCollectedAsync(
        Guid? saleUserId,
        DateTime from,
        DateTime to,
        CancellationToken cancellationToken)
    {
        var q = _context.ReceivablePayments.AsNoTracking()
            .Include(p => p.CustomerReceivable)
            .ThenInclude(r => r.Sale)
            .Where(p => !p.IsCredit && !p.IsChequePending && !p.IsVoided
                && p.PaymentDate >= from && p.PaymentDate < to);

        if (saleUserId.HasValue)
            q = q.Where(p => p.CustomerReceivable.Sale!.UserId == saleUserId.Value);

        return await q.SumAsync(p => (decimal?)p.Amount, cancellationToken) ?? 0;
    }
}
