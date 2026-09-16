using GensanPOS.Domain.Enums;

namespace GensanPOS.Application.Common;

public static class ExpenseLabels
{
    public static string StatusLabel(ExpenseVoucherStatus status) => status switch
    {
        ExpenseVoucherStatus.Paid => "Paid",
        ExpenseVoucherStatus.Cancelled => "Cancelled",
        _ => "Unpaid"
    };

    public static string PaymentMethodLabel(ExpensePaymentMethod method) => method switch
    {
        ExpensePaymentMethod.Check => "Check",
        ExpensePaymentMethod.BankTransfer => "Bank Transfer",
        ExpensePaymentMethod.OnlineBank => "Online Bank",
        ExpensePaymentMethod.Other => "Other",
        _ => "Cash"
    };
}
