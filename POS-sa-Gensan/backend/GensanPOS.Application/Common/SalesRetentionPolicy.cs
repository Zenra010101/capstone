using GensanPOS.Application.Exceptions;
using GensanPOS.Domain.Constants;

namespace GensanPOS.Application.Common;

/// <summary>
/// Role-based sales history retention (store-local calendar dates, Asia/Manila).
/// </summary>
public static class SalesRetentionPolicy
{
    public const int CashierLookbackDays = 7;
    public const int OwnerRetentionYears = 5;

    public const string CashierDeniedMessage = "Cashiers can only view sales records from the last 7 days.";
    public const string OwnerDeniedMessage = "Records older than 5 years are outside the retention period.";

    public static DateTime GetStoreLocalToday(DateTime? utcNow = null)
    {
        var utc = utcNow ?? DateTime.UtcNow;
        if (utc.Kind != DateTimeKind.Utc)
            utc = utc.ToUniversalTime();
        return TimeZoneInfo.ConvertTimeFromUtc(utc, StoreTimeZone).Date;
    }

    public static DateTime GetEarliestAllowedLocalDate(string role, DateTime? utcNow = null)
    {
        var today = GetStoreLocalToday(utcNow);
        return RoleNames.IsOwner(role)
            ? today.AddYears(-OwnerRetentionYears)
            : today.AddDays(-CashierLookbackDays);
    }

    public static DateTime GetEarliestAllowedUtc(string role, DateTime? utcNow = null) =>
        LocalDateStartToUtc(GetEarliestAllowedLocalDate(role, utcNow));

    public static string GetDeniedMessage(string role) =>
        RoleNames.IsOwner(role) ? OwnerDeniedMessage : CashierDeniedMessage;

    public static void EnsureSaleAccessible(string role, DateTime saleCreatedAtUtc)
    {
        var saleLocal = ToStoreLocal(saleCreatedAtUtc).Date;
        if (saleLocal < GetEarliestAllowedLocalDate(role))
            throw new ForbiddenException(GetDeniedMessage(role));
    }

    public static void EnsureReportLocalRangeAllowed(string role, DateTime fromLocal, DateTime toLocalInclusive)
    {
        var earliest = GetEarliestAllowedLocalDate(role);
        if (toLocalInclusive.Date < earliest || fromLocal.Date < earliest)
            throw new ForbiddenException(GetDeniedMessage(role));
    }

    /// <summary>
    /// Normalize sales list/history query bounds. Clamps <paramref name="from"/> to retention floor;
    /// rejects ranges entirely before retention.
    /// </summary>
    public static (DateTime FromUtc, DateTime ToExclusiveUtc) NormalizeListRange(
        string role,
        DateTime? from,
        DateTime? to,
        DateTime? utcNow = null)
    {
        var earliest = GetEarliestAllowedLocalDate(role, utcNow);
        var today = GetStoreLocalToday(utcNow);

        var fromLocal = from?.Date ?? earliest;
        var toLocal = to?.Date ?? today;

        if (toLocal < earliest)
            throw new ForbiddenException(GetDeniedMessage(role));

        if (fromLocal < earliest)
            fromLocal = earliest;
        if (toLocal > today)
            toLocal = today;
        if (fromLocal > toLocal)
            fromLocal = toLocal;

        return (LocalDateStartToUtc(fromLocal), LocalDateStartToUtc(toLocal.AddDays(1)));
    }

    public static (DateTime FromUtc, DateTime ToExclusiveUtc) ClampUtcRange(
        string role,
        DateTime fromUtc,
        DateTime toExclusiveUtc)
    {
        var toLocalInclusive = ToStoreLocal(toExclusiveUtc.AddTicks(-1)).Date;
        return NormalizeListRange(role, ToStoreLocal(fromUtc).Date, toLocalInclusive);
    }

    public static DateTime ToStoreLocal(DateTime utc)
    {
        var normalized = utc.Kind switch
        {
            DateTimeKind.Utc => utc,
            DateTimeKind.Local => utc.ToUniversalTime(),
            _ => DateTime.SpecifyKind(utc, DateTimeKind.Utc)
        };
        return TimeZoneInfo.ConvertTimeFromUtc(normalized, StoreTimeZone);
    }

    public static DateTime LocalDateStartToUtc(DateTime localCalendarDate)
    {
        var unspecified = DateTime.SpecifyKind(localCalendarDate.Date, DateTimeKind.Unspecified);
        return DateTime.SpecifyKind(TimeZoneInfo.ConvertTimeToUtc(unspecified, StoreTimeZone), DateTimeKind.Utc);
    }

    private static TimeZoneInfo StoreTimeZone { get; } = ResolveStoreTimeZone();

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
