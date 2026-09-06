namespace GensanPOS.Application.DTOs.Analytics;

public class OwnerDashboardProfitDto
{
    public decimal TodayProfit { get; set; }
    public decimal TodaySalesProfit { get; set; }
    public decimal TodayReturnsProfitReversed { get; set; }
    public decimal TodayEvenExchangeProfit { get; set; }
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

public class ProfitByCategoryDto
{
    public string CategoryName { get; set; } = string.Empty;
    public int QuantitySold { get; set; }
    public decimal Revenue { get; set; }
    public decimal Cost { get; set; }
    public decimal Profit { get; set; }
}
