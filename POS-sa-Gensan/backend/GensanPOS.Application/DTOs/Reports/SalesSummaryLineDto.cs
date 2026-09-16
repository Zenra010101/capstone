namespace GensanPOS.Application.DTOs.Reports;

public class SalesSummaryLineDto
{
    public DateTime SaleDate { get; set; }
    public string DrNumber { get; set; } = string.Empty;
    public string? CiNumber { get; set; }
    public string? ChNumber { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string Size { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal CashAmount { get; set; }
    public decimal CurrentAmount { get; set; }
    public decimal ChargeAmount { get; set; }
    public decimal OnlineAmount { get; set; }
    public string Term { get; set; } = string.Empty;
}
