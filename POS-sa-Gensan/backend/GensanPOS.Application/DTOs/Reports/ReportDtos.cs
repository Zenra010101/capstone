namespace GensanPOS.Application.DTOs.Reports;

public class SalesReportDto
{
    public DateTime From { get; set; }
    public DateTime To { get; set; }
    public int TransactionCount { get; set; }
    public decimal GrossSales { get; set; }
    public decimal TotalReturns { get; set; }
    public decimal NetSales { get; set; }
    public decimal CollectedAtSale { get; set; }
    public decimal CollectedInPeriod { get; set; }
    public decimal TotalTax { get; set; }
    public decimal TotalWithholding { get; set; }
    public decimal TotalDiscount { get; set; }
    public List<PaymentMethodSummaryDto> ByPaymentMethod { get; set; } = [];
    public List<SalesReportRowDto> Rows { get; set; } = [];
}

public class SalesReportRowDto
{
    public Guid Id { get; set; }
    public string SaleNumber { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string CashierName { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;
    public string? CustomerName { get; set; }
    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public string TaxTypeLabel { get; set; } = string.Empty;
    public decimal TaxAmount { get; set; }
    public decimal WithholdingAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal CollectedAmount { get; set; }
    public decimal ReceivableAmount { get; set; }
    public decimal GrossProfit { get; set; }
}

public class PaymentMethodSummaryDto
{
    public string Method { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal Amount { get; set; }
    public decimal InvoiceAmount { get; set; }
    public decimal CollectedAmount { get; set; }
}

public class ProfitReportDto
{
    public DateTime From { get; set; }
    public DateTime To { get; set; }
    public decimal GrossSales { get; set; }
    public decimal Returns { get; set; }
    public decimal NetSales { get; set; }
    public decimal CostOfGoodsSold { get; set; }
    public decimal ReturnsCost { get; set; }
    public decimal NetCost { get; set; }
    public decimal GrossProfit { get; set; }
    public decimal ProfitMarginPercent { get; set; }
    public List<ProfitByDayDto> ByDay { get; set; } = [];
    public List<ProfitByProductDto> ByProduct { get; set; } = [];
    public List<ProfitByCategoryReportDto> ByCategory { get; set; } = [];
}

public class ProfitByCategoryReportDto
{
    public string CategoryName { get; set; } = string.Empty;
    public int QuantitySold { get; set; }
    public decimal Revenue { get; set; }
    public decimal Cost { get; set; }
    public decimal Profit { get; set; }
}

public class ProfitByDayDto
{
    public string Date { get; set; } = string.Empty;
    public decimal NetSales { get; set; }
    public decimal Cost { get; set; }
    public decimal Profit { get; set; }
}

public class ProfitByProductDto
{
    public string ProductName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public int QuantitySold { get; set; }
    public decimal Revenue { get; set; }
    public decimal Cost { get; set; }
    public decimal Profit { get; set; }
}
