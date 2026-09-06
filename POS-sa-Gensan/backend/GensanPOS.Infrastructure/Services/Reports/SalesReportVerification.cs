using System.Globalization;
using System.Text.Json;
using GensanPOS.Application.DTOs.Reports;
using GensanPOS.Domain.Entities;

namespace GensanPOS.Infrastructure.Services.Reports;

internal static class SalesReportVerification
{
    public const string SystemName = "GENSAN POS & INVENTORY";
    public const string ReportTitle = "Daily Sales Report";
    public const string VerifiedStatus = "Verified Report";

    /// <summary>QR encodes a verification URL so phone cameras open the verify page.</summary>
    public static string BuildQrContent(string verificationUrl) => verificationUrl.Trim();

    public static string BuildReportCode(DateTime generatedAtUtc)
    {
        var suffix = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
        var localDate = SalesReportTimeZone.ToLocal(generatedAtUtc);
        return $"DSR-{localDate:yyyyMMdd}-{suffix}";
    }

    public static string FormatDateRange(DateTime from, DateTime to)
    {
        if (from.Date == to.Date)
            return from.ToString("MMMM d, yyyy", CultureInfo.InvariantCulture);

        return $"{from:MMMM d, yyyy} to {to:MMMM d, yyyy}";
    }

    public static string BuildQrPayloadJson(SalesSummaryReportDto report, string generatedBy)
    {
        var period = FormatDateRange(report.From, report.To);
        var generatedAt = SalesReportTimeZone.ToLocal(report.GeneratedAt)
            .ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture);

        var payload = new Dictionary<string, string>
        {
            ["system"] = "GENSAN POS",
            ["report"] = ReportTitle,
            ["reportId"] = report.VerificationReportCode,
            ["generatedAt"] = generatedAt,
            ["generatedBy"] = generatedBy,
            ["period"] = period,
            ["totalSales"] = report.TotalLineAmount.ToString("N2", CultureInfo.InvariantCulture),
            ["verifyUrl"] = report.VerificationUrl
        };

        return JsonSerializer.Serialize(payload);
    }

    public static SalesReportVerificationViewDto ToViewDto(
        SalesReportVerificationRecord record,
        string? generatedByName = null)
    {
        return new SalesReportVerificationViewDto
        {
            ReportId = record.ReportCode,
            ReportTitle = ReportTitle,
            SystemName = SystemName,
            ReportDateRange = FormatDateRange(record.FromDate, record.ToDate),
            PeriodLabel = record.PeriodLabel,
            GrossSales = record.GrossSales,
            NetSales = record.NetSales,
            TotalLineAmount = record.TotalLineAmount,
            TotalSales = record.TotalLineAmount,
            PrintedAtLabel = record.PrintedAtLabel,
            GeneratedAtLabel = SalesReportTimeZone.FormatPrintedAtPrecise(record.PrintedAtUtc),
            GeneratedBy = generatedByName,
            Status = VerifiedStatus,
            StoreName = record.StoreName
        };
    }
}
