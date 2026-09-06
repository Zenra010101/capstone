using GensanPOS.Application.Common;
using GensanPOS.Domain.Constants;

namespace GensanPOS.Infrastructure.Services.Reports;

public static class SalesReportSummaryAccess
{
    public static void EnsureCanAccess(string role, string preset)
    {
        if (RoleNames.IsOwner(role))
            return;

        var (_, _, fromLocal, toLocalInclusive, _) =
            SalesReportPresetResolver.Resolve(preset, null, null);
        SalesRetentionPolicy.EnsureReportLocalRangeAllowed(role, fromLocal, toLocalInclusive);
    }
}
