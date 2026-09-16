using GensanPOS.Domain.Enums;

namespace GensanPOS.Application.Common;

public static class GrsStatusLabels
{
    public static string Label(GrsStatus status, GrsWorkflowKind workflow) => status switch
    {
        GrsStatus.Completed => "Completed",
        GrsStatus.Cancelled => "Cancelled",
        GrsStatus.Voided => "Voided",
        GrsStatus.Draft => "Draft",
        GrsStatus.PendingInspection => "Pending inspection",
        GrsStatus.Approved => workflow == GrsWorkflowKind.ExchangeReturn
            ? "Approved — awaiting exchange"
            : "Approved",
        GrsStatus.Rejected => "Rejected",
        GrsStatus.ExchangeCancelled => "Cancelled",
        _ => status.ToString()
    };

    public static bool IsLegacyDocument(GrsWorkflowKind kind) => kind == GrsWorkflowKind.LegacyRefund;
}
