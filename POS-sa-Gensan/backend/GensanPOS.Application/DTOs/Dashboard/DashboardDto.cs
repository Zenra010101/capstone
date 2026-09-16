namespace GensanPOS.Application.DTOs.Dashboard;

public class DashboardDto
{
    public decimal TodaySales { get; set; }
    public decimal TodayReturns { get; set; }
    public decimal TodayNetSales { get; set; }
    public decimal TodayCollected { get; set; }
    public int TodayTransactions { get; set; }
    public decimal MyTodaySales { get; set; }
    public decimal MyTodayCollected { get; set; }
    public int MyTodayTransactions { get; set; }
    public decimal CashiersTodaySales { get; set; }
    public decimal CashiersTodayCollected { get; set; }
    public int CashiersTodayTransactions { get; set; }
    /// <summary>Today gross invoice sales rung up by users with the Owner role.</summary>
    public decimal OwnerRoleTodaySales { get; set; }
    public decimal OwnerRoleTodayReturns { get; set; }
    public decimal OwnerRoleTodayNetSales { get; set; }
    public int OwnerRoleTodayTransactions { get; set; }
    /// <summary>Today gross invoice sales rung up by users with the Cashier role.</summary>
    public decimal CashierRoleTodaySales { get; set; }
    public decimal CashierRoleTodayReturns { get; set; }
    public decimal CashierRoleTodayNetSales { get; set; }
    public int CashierRoleTodayTransactions { get; set; }
    public decimal StoreTodaySales { get; set; }
    public decimal StoreTodayCollected { get; set; }
    public int TotalProducts { get; set; }
    public int LowStockCount { get; set; }
    public bool IsOwnerView { get; set; }
    public List<DailySalesSummary> Last7Days { get; set; } = [];
    public List<TopProductSummary> TopProducts { get; set; } = [];
    public decimal TodayProfit { get; set; }
    public decimal TodaySalesProfit { get; set; }
    public decimal TodayReturnsProfitReversed { get; set; }
    public int TodayZeroCostSaleLineCount { get; set; }
    public bool ProfitMissingCostWarning { get; set; }
    public decimal MonthSales { get; set; }
    public decimal MonthProfit { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal TotalProfit { get; set; }
    public decimal InventoryValue { get; set; }
    public List<DailyProfitPointDto> ProfitLast7Days { get; set; } = [];
}

public class DailyProfitPointDto
{
    public string Date { get; set; } = string.Empty;
    public decimal Sales { get; set; }
    public decimal Profit { get; set; }
}

public class DailySalesSummary
{
    public string Date { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public decimal Returns { get; set; }
    public decimal NetTotal { get; set; }
    public decimal Collected { get; set; }
    public int Count { get; set; }
}

public class TopProductSummary
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public int QuantitySold { get; set; }
    public decimal Revenue { get; set; }
}
