using GensanPOS.Application.Exceptions;

namespace GensanPOS.Infrastructure.Services.Reports;

public static class SalesReportPresetResolver
{
    private static readonly TimeZoneInfo StoreTimeZone = ResolveStoreTimeZone();

    public static (DateTime FromUtc, DateTime ToExclusiveUtc, DateTime FromLocal, DateTime ToLocalInclusive, string Label)
        Resolve(string preset, DateTime? customFrom, DateTime? customTo)
    {
        var nowLocal = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, StoreTimeZone);
        var today = nowLocal.Date;

        DateTime fromLocal;
        DateTime toLocalInclusive;

        var key = preset.Trim().ToLowerInvariant();
        switch (key)
        {
            case "today":
                fromLocal = today;
                toLocalInclusive = today;
                break;
            case "yesterday":
                fromLocal = today.AddDays(-1);
                toLocalInclusive = today.AddDays(-1);
                break;
            case "thisweek":
                fromLocal = StartOfWeek(today);
                toLocalInclusive = today;
                break;
            case "lastweek":
                var thisWeekStart = StartOfWeek(today);
                fromLocal = thisWeekStart.AddDays(-7);
                toLocalInclusive = thisWeekStart.AddDays(-1);
                break;
            case "thismonth":
                fromLocal = new DateTime(today.Year, today.Month, 1);
                toLocalInclusive = today;
                break;
            case "lastmonth":
                var firstThisMonth = new DateTime(today.Year, today.Month, 1);
                fromLocal = firstThisMonth.AddMonths(-1);
                toLocalInclusive = firstThisMonth.AddDays(-1);
                break;
            case "custom":
                if (!customFrom.HasValue || !customTo.HasValue)
                    throw new AppException("Custom range requires from and to dates.");
                fromLocal = customFrom.Value.Date;
                toLocalInclusive = customTo.Value.Date;
                if (toLocalInclusive < fromLocal)
                    throw new AppException("End date must be on or after start date.");
                break;
            default:
                throw new AppException($"Unknown report preset: {preset}");
        }

        var fromUtc = LocalDateToUtcStart(fromLocal);
        var toExclusiveUtc = LocalDateToUtcStart(toLocalInclusive.AddDays(1));
        var label = BuildLabel(key, fromLocal, toLocalInclusive);
        return (fromUtc, toExclusiveUtc, fromLocal, toLocalInclusive, label);
    }

    private static DateTime StartOfWeek(DateTime date)
    {
        var diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;
        return date.AddDays(-diff).Date;
    }

    private static string BuildLabel(string preset, DateTime from, DateTime to)
    {
        return preset switch
        {
            "today" => $"Today — {from:MMMM d, yyyy}",
            "yesterday" => $"Yesterday — {from:MMMM d, yyyy}",
            "thisweek" => from == to
                ? $"This week — {from:MMMM d, yyyy}"
                : $"This week — {from:MMM d} – {to:MMM d, yyyy}",
            "lastweek" => $"Last week — {from:MMM d} – {to:MMM d, yyyy}",
            "thismonth" => from == to
                ? $"This month — {from:MMMM d, yyyy}"
                : $"This month — {from:MMM d} – {to:MMM d, yyyy}",
            "lastmonth" => $"Last month — {from:MMMM yyyy}",
            "custom" => from == to
                ? $"Custom — {from:MMMM d, yyyy}"
                : $"Custom — {from:MMM d, yyyy} – {to:MMM d, yyyy}",
            _ => $"{from:yyyy-MM-dd} – {to:yyyy-MM-dd}"
        };
    }

    private static DateTime LocalDateToUtcStart(DateTime localDate)
    {
        var unspecified = DateTime.SpecifyKind(localDate, DateTimeKind.Unspecified);
        return TimeZoneInfo.ConvertTimeToUtc(unspecified, StoreTimeZone);
    }

    private static TimeZoneInfo ResolveStoreTimeZone()
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
