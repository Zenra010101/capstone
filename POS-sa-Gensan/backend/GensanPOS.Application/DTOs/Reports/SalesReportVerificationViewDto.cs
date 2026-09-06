namespace GensanPOS.Application.DTOs.Reports;

public class SalesReportVerificationViewDto
{
    public string ReportId { get; set; } = string.Empty;
    public string ReportTitle { get; set; } = "Daily Sales Report";
    public string SystemName { get; set; } = "GENSAN POS & INVENTORY";
    public string ReportDateRange { get; set; } = string.Empty;
    public string PeriodLabel { get; set; } = string.Empty;
    public decimal GrossSales { get; set; }
    public decimal NetSales { get; set; }
    public decimal TotalLineAmount { get; set; }
    public decimal TotalSales { get; set; }
    public string PrintedAtLabel { get; set; } = string.Empty;
    public string GeneratedAtLabel { get; set; } = string.Empty;
    public string? GeneratedBy { get; set; }
    public string Status { get; set; } = "Verified Report";
    public string? StoreName { get; set; }
}
