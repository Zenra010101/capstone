using GensanPOS.Application.DTOs.Reports;

namespace GensanPOS.Infrastructure.Services.Reports;

internal static class SalesReportTimeZone
{
    public static TimeZoneInfo Info { get; } = Resolve();

    /// <summary>Legal print stamp, e.g. Monday, June 06, 2026 at 4:51 PM</summary>
    public static string FormatPrintedAt(DateTime utc)
    {
        var local = ToLocal(utc);
        return local.ToString("dddd, MMMM dd, yyyy 'at' h:mm tt", System.Globalization.CultureInfo.InvariantCulture);
    }

    /// <summary>Signature DATE line, e.g. JUNE 07, 2026</summary>
    public static string FormatPrintedDateLabel(DateTime utc)
    {
        var local = ToLocal(utc);
        return local.ToString("MMMM dd, yyyy", System.Globalization.CultureInfo.InvariantCulture).ToUpperInvariant();
    }

    /// <summary>Footer timestamp with seconds, e.g. June 23, 2026 09:36:48 AM</summary>
    public static string FormatPrintedAtPrecise(DateTime utc)
    {
        var local = ToLocal(utc);
        return local.ToString("MMMM d, yyyy hh:mm:ss tt", System.Globalization.CultureInfo.InvariantCulture);
    }

    public static DateTime ToLocal(DateTime utc)
    {
        var normalized = utc.Kind switch
        {
            DateTimeKind.Utc => utc,
            DateTimeKind.Local => utc.ToUniversalTime(),
            _ => DateTime.SpecifyKind(utc, DateTimeKind.Utc)
        };
        return TimeZoneInfo.ConvertTimeFromUtc(normalized, Info);
    }

    /// <summary>Start of a store-local calendar day expressed as UTC (for PostgreSQL timestamptz filters).</summary>
    public static DateTime LocalDateStartToUtc(DateTime localCalendarDate)
    {
        var unspecified = DateTime.SpecifyKind(localCalendarDate.Date, DateTimeKind.Unspecified);
        return TimeZoneInfo.ConvertTimeToUtc(unspecified, Info);
    }

    public static ReportPrintStampDto CreateStamp(DateTime? utc = null)
    {
        var generated = utc ?? DateTime.UtcNow;
        if (generated.Kind != DateTimeKind.Utc)
            generated = generated.Kind == DateTimeKind.Local
                ? generated.ToUniversalTime()
                : DateTime.SpecifyKind(generated, DateTimeKind.Utc);

        return new ReportPrintStampDto
        {
            GeneratedAt = generated,
            PrintedAtLabel = FormatPrintedAt(generated),
            PrintedDateLabel = FormatPrintedDateLabel(generated),
            PrintedAtPreciseLabel = FormatPrintedAtPrecise(generated)
        };
    }

    public static string StampSubtitle(string? detail = null)
    {
        var stamp = CreateStamp();
        return string.IsNullOrWhiteSpace(detail)
            ? $"Printed: {stamp.PrintedAtLabel}"
            : $"{detail} · Printed: {stamp.PrintedAtLabel}";
    }

    private static TimeZoneInfo Resolve()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(
                OperatingSystem.IsWindows() ? "Singapore Standard Time" : "Asia/Manila");
        }
        catch
        {
            return TimeZoneInfo.Utc;
        }
    }
}
