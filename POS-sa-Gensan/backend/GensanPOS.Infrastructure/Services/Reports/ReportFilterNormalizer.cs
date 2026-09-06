using GensanPOS.Application.DTOs.Reports;

namespace GensanPOS.Infrastructure.Services.Reports;

internal static class ReportFilterNormalizer
{
    public static (DateTime from, DateTime toExclusive, int page, int pageSize) Normalize(
        ReportQueryFilter filter)
    {
        var page = Math.Max(1, filter.Page);
        var pageSize = Math.Clamp(filter.PageSize, 10, 500);

        DateTime fromDate;
        DateTime toExclusive;
        var todayLocal = SalesReportTimeZone.ToLocal(DateTime.UtcNow).Date;

        if (string.Equals(filter.Period, "yearly", StringComparison.OrdinalIgnoreCase))
        {
            var year = filter.From?.Year ?? todayLocal.Year;
            var fromLocal = new DateTime(year, 1, 1);
            fromDate = SalesReportTimeZone.LocalDateStartToUtc(fromLocal);
            toExclusive = SalesReportTimeZone.LocalDateStartToUtc(fromLocal.AddYears(1));
        }
        else if (string.Equals(filter.Period, "monthly", StringComparison.OrdinalIgnoreCase))
        {
            var anchor = filter.From?.Date ?? todayLocal;
            var fromLocal = new DateTime(anchor.Year, anchor.Month, 1);
            fromDate = SalesReportTimeZone.LocalDateStartToUtc(fromLocal);
            toExclusive = SalesReportTimeZone.LocalDateStartToUtc(fromLocal.AddMonths(1));
        }
        else
        {
            var fromLocal = filter.From?.Date ?? todayLocal.AddDays(-30);
            var toLocalInclusive = filter.To?.Date ?? todayLocal;
            fromDate = SalesReportTimeZone.LocalDateStartToUtc(fromLocal);
            toExclusive = SalesReportTimeZone.LocalDateStartToUtc(toLocalInclusive.AddDays(1));
            if (toExclusive <= fromDate)
                toExclusive = SalesReportTimeZone.LocalDateStartToUtc(fromLocal.AddDays(1));
        }

        return (fromDate, toExclusive, page, pageSize);
    }
}
