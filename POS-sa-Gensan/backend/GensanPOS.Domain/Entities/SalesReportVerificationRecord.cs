using GensanPOS.Domain.Common;

namespace GensanPOS.Domain.Entities;

/// <summary>
/// Immutable snapshot issued when a daily sales report is printed or exported as PDF.
/// QR codes link to this record for tamper verification.
/// </summary>
public class SalesReportVerificationRecord : BaseEntity
{
    public string ReportCode { get; set; } = string.Empty;
    public string Preset { get; set; } = string.Empty;
    public string PeriodLabel { get; set; } = string.Empty;
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public decimal GrossSales { get; set; }
    public decimal NetSales { get; set; }
    public decimal TotalLineAmount { get; set; }
    public string PrintedAtLabel { get; set; } = string.Empty;
    public DateTime PrintedAtUtc { get; set; }
    public string? StoreName { get; set; }
    public Guid? GeneratedByUserId { get; set; }
}
