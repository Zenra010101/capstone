namespace GensanPOS.Application.DTOs.Reports;

public class SalesSummaryReportDto
{
    public DateTime GeneratedAt { get; set; }
    /// <summary>Server-formatted print stamp (Asia/Manila). Not client-editable.</summary>
    public string PrintedAtLabel { get; set; } = string.Empty;
    /// <summary>Server-formatted signature date (Asia/Manila).</summary>
    public string PrintedDateLabel { get; set; } = string.Empty;
    public string PeriodLabel { get; set; } = string.Empty;
    public string Preset { get; set; } = string.Empty;
    public DateTime From { get; set; }
    public DateTime To { get; set; }
    public string? PreparedFor { get; set; }
    /// <summary>User who printed or exported the report.</summary>
    public string? PrintedBy { get; set; }
    public int TransactionCount { get; set; }
    public decimal GrossSales { get; set; }
    public int ReturnTransactionCount { get; set; }
    public int ExchangeCount { get; set; }
    public decimal TotalReturns { get; set; }
    public decimal NetSales { get; set; }
    public string? StoreName { get; set; }
    public string? StoreAddress { get; set; }
    public decimal TotalLineAmount { get; set; }
    public decimal TotalCash { get; set; }
    public decimal TotalCurrent { get; set; }
    public decimal TotalCharge { get; set; }
    public decimal TotalOnline { get; set; }
    /// <summary>Human-readable report ID, e.g. DSR-20260606-A3F2B891.</summary>
    public string VerificationReportCode { get; set; } = string.Empty;
    /// <summary>URL opened when the verification QR code is scanned.</summary>
    public string VerificationUrl { get; set; } = string.Empty;
    /// <summary>QR encodes <see cref="VerificationUrl"/> for phone scanners.</summary>
    public string VerificationQrText { get; set; } = string.Empty;
    /// <summary>Structured JSON metadata embedded in verification (display / audit).</summary>
    public string VerificationQrPayload { get; set; } = string.Empty;
    /// <summary>PNG QR code (base64) generated server-side.</summary>
    public string VerificationQrPngBase64 { get; set; } = string.Empty;
    public List<SalesSummaryLineDto> Lines { get; set; } = [];
}
