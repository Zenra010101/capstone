using GensanPOS.Domain.Enums;

namespace GensanPOS.Application.Common;

public static class ExportLabels
{
    public static string GrsRefund(GrsRefundMethod method) => method switch
    {
        GrsRefundMethod.Cash => "Cash refund",
        GrsRefundMethod.Qrph => "QRPH refund",
        GrsRefundMethod.OnlineBank => "Online bank refund",
        GrsRefundMethod.UtangCredit => "Charge credit",
        GrsRefundMethod.Cheque => "Cheque reversal",
        GrsRefundMethod.StoreCredit => "Store credit",
        _ => method.ToString()
    };

    public static string GrsStatusLabel(GrsStatus status) => status switch
    {
        GrsStatus.Completed => "Completed",
        GrsStatus.Cancelled => "Cancelled",
        GrsStatus.Voided => "Voided",
        _ => status.ToString()
    };

    public static string ReceivableStatusLabel(ReceivableStatus status) => status switch
    {
        ReceivableStatus.Paid => "Paid",
        ReceivableStatus.Unpaid => "Unpaid",
        ReceivableStatus.Partial => "Partial",
        ReceivableStatus.Overdue => "Overdue",
        _ => status.ToString()
    };
}
