namespace GensanPOS.Application.DTOs.Reports;

/// <summary>Server-generated print timestamp (Asia/Manila). Read-only for clients.</summary>
public class ReportPrintStampDto
{
    public DateTime GeneratedAt { get; set; }
    public string PrintedAtLabel { get; set; } = string.Empty;
    public string PrintedDateLabel { get; set; } = string.Empty;
    /// <summary>Receipt footer, e.g. June 23, 2026 10:33:00 AM</summary>
    public string PrintedAtPreciseLabel { get; set; } = string.Empty;
}
